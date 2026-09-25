import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Clock3,
  ExternalLink,
  MapPin,
  MessageCircle,
  Moon,
  Search,
  Star,
  Sun,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

type HourPoint = {
  hour: number;
  occupancyPercent: number;
};

type PopularTimes = Record<string, HourPoint[]>;

type Venue = {
  place_id?: string;
  name?: string;
  address?: string;
  rating?: number | null;
  reviews?: number;
  phone?: string;
  website?: string;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string;
  popular_times?: PopularTimes;
  live_busy_text?: string | null;
  live_busy_percent?: number | null;
  opening_hours?: Array<{
    day: string;
    hours: string;
  }>;
};

type TooltipData = {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  percent: number;
} | null;

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const DAYS = [
  { key: "Mo", label: "Monday", short: "Mon" },
  { key: "Tu", label: "Tuesday", short: "Tue" },
  { key: "We", label: "Wednesday", short: "Wed" },
  { key: "Th", label: "Thursday", short: "Thu" },
  { key: "Fr", label: "Friday", short: "Fri" },
  { key: "Sa", label: "Saturday", short: "Sat" },
  { key: "Su", label: "Sunday", short: "Sun" },
];

function formatHour(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const display = normalized % 12 || 12;

  return `${display} ${suffix}`;
}

function getBusyLabel(percent: number | null | undefined) {
  if (percent === null || percent === undefined) {
    return "Unavailable";
  }

  if (percent >= 80) return "Very busy";
  if (percent >= 55) return "Busy";
  if (percent >= 30) return "Moderate";

  return "Quiet";
}

function getBusyClass(percent: number | null | undefined) {
  if (percent === null || percent === undefined) {
    return "neutral";
  }

  if (percent >= 80) return "danger";
  if (percent >= 55) return "warning";

  return "success";
}

/** Color scale for bars & heatmap cells based on occupancy % */
function getLevelClass(percent: number) {
  if (percent >= 80) return "level-4";
  if (percent >= 60) return "level-3";
  if (percent >= 35) return "level-2";
  if (percent > 0) return "level-1";
  return "level-0";
}

function getBarGradient(percent: number) {
  if (percent >= 80) {
    return "linear-gradient(180deg, #ff8a8a 0%, #ff5c5c 45%, #e03e3e 100%)";
  }
  if (percent >= 60) {
    return "linear-gradient(180deg, #ffc978 0%, #ffb454 45%, #e89a2e 100%)";
  }
  if (percent >= 35) {
    return "linear-gradient(180deg, #7ee0ff 0%, #5aa9ff 45%, #3b82f6 100%)";
  }
  if (percent > 0) {
    return "linear-gradient(180deg, #75e7a6 0%, #49d68b 45%, #238952 100%)";
  }
  return "linear-gradient(180deg, #3a4a42 0%, #2a3a32 100%)";
}

function normalizeVenue(result: any): Venue {
  const location = result?.location || {};

  return {
    place_id:
      result?.placeId ||
      result?.place_id,

    name:
      result?.title ||
      result?.name,

    address:
      result?.address,

    rating:
      result?.rating ?? null,

    reviews:
      result?.reviews ??
      result?.reviewsCount ??
      result?.reviewCount ??
      0,

    phone:
      result?.phone,

    website:
      result?.website,

    latitude:
      location?.lat ??
      result?.latitude ??
      null,

    longitude:
      location?.lng ??
      result?.longitude ??
      null,

    google_maps_url:
      result?.googleMapsUrl ||
      result?.google_maps_url ||
      result?.placeUrl ||
      undefined,

    popular_times:
      result?.popularTimesHistogram ||
      result?.popular_times ||
      {},

    live_busy_percent:
      result?.popularTimesLivePercent ??
      result?.live_busy_percent ??
      null,

    live_busy_text:
      result?.popularTimesLiveText ||
      result?.live_busy_text ||
      null,

    opening_hours:
      result?.openingHours ||
      result?.opening_hours ||
      [],
  };
}

function App() {
  const [query, setQuery] = useState("");
  const [venue, setVenue] = useState<Venue | null>(null);
  const [selectedDay, setSelectedDay] = useState("Mo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("spotpulse-theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });
  const [tooltip, setTooltip] = useState<TooltipData>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("spotpulse-theme", theme);
  }, [theme]);

  const selectedPoints =
    venue?.popular_times?.[selectedDay] || [];

  const peak = useMemo(() => {
    if (!selectedPoints.length) return null;

    return selectedPoints.reduce(
      (highest, current) =>
        current.occupancyPercent >
        highest.occupancyPercent
          ? current
          : highest
    );
  }, [selectedPoints]);

  const average = useMemo(() => {
    if (!selectedPoints.length) return null;

    const total = selectedPoints.reduce(
      (sum, item) =>
        sum + item.occupancyPercent,
      0
    );

    return Math.round(
      total / selectedPoints.length
    );
  }, [selectedPoints]);

  const heatmapRows = useMemo(() => {
    if (!venue?.popular_times) return [];

    return DAYS.map((day) => ({
      ...day,
      points:
        venue.popular_times?.[day.key] || [],
    }));
  }, [venue]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function showTooltip(
    e: MouseEvent,
    title: string,
    subtitle: string,
    percent: number
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top,
      title,
      subtitle,
      percent,
    });
  }

  function hideTooltip() {
    setTooltip(null);
  }

  async function handleSearch(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!query.trim()) {
      setError(
        "Enter a restaurant name or Google Maps URL."
      );
      return;
    }

    setLoading(true);
    setError("");
    setVenue(null);
    setSearched(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/places/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Unable to retrieve restaurant data."
        );
      }

      const result =
        data?.data ||
        data?.venue ||
        data?.result ||
        data;

      if (!result || result.found === false) {
        throw new Error(
          result?.message ||
            "No restaurant was found."
        );
      }

      const normalizedVenue =
        normalizeVenue(result);

      console.log(
        "SPOTPULSE RAW API RESPONSE:",
        result
      );

      console.log(
        "SPOTPULSE NORMALIZED VENUE:",
        normalizedVenue
      );

      console.log(
        "SPOTPULSE POPULAR TIMES:",
        normalizedVenue.popular_times
      );

      console.log(
        "SPOTPULSE LIVE:",
        normalizedVenue.live_busy_percent,
        normalizedVenue.live_busy_text
      );

      setVenue(normalizedVenue);

      if (
        normalizedVenue.popular_times &&
        Object.keys(
          normalizedVenue.popular_times
        ).length > 0
      ) {
        if (
          normalizedVenue.popular_times.Mo?.length
        ) {
          setSelectedDay("Mo");
        } else {
          const firstDay =
            Object.keys(
              normalizedVenue.popular_times
            )[0];

          setSelectedDay(firstDay);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while searching."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Activity
              size={20}
              strokeWidth={2.5}
            />
          </div>

          <div>
            <div className="brand-name">
              SpotPulse
            </div>

            <div className="brand-subtitle">
              AI Intelligence
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>

          <div className="status-pill">
            <span className="status-dot" />
            Live analytics
          </div>

          <div className="avatar">
            SP
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <Zap size={14} />
              GOOGLE MAPS INTELLIGENCE
            </div>

            <h1>
              Understand when
              <span>
                {" "}
                places get busy.
              </span>
            </h1>

            <p>
              Search a restaurant to analyze
              its real Google Maps Popular
              Times, current busyness and
              weekly activity.
            </p>
          </div>
        </section>

        <form
          className="search-box"
          onSubmit={handleSearch}
        >
          <div className="search-icon">
            <Search size={21} />
          </div>

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search restaurant or paste Google Maps URL..."
            aria-label="Restaurant search"
          />

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Analyzing..."
              : "Analyze"}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <span>!</span>
            {error}
          </div>
        )}

        {!venue && !loading && (
          <section className="empty-dashboard">
            <div className="empty-icon">
              <BarChart3 size={30} />
            </div>

            <h2>
              {searched
                ? "No restaurant data to display"
                : "Your restaurant intelligence starts here"}
            </h2>

            <p>
              Enter a restaurant name above
              and SpotPulse will build the
              analytics dashboard from live
              scraped data.
            </p>

            <div className="feature-row">
              <div className="feature-card">
                <Clock3 size={20} />

                <div>
                  <strong>
                    Popular Times
                  </strong>

                  <span>
                    Hourly activity patterns
                  </span>
                </div>
              </div>

              <div className="feature-card">
                <Activity size={20} />

                <div>
                  <strong>
                    Live Busyness
                  </strong>

                  <span>
                    Current activity level
                  </span>
                </div>
              </div>

              <div className="feature-card">
                <TrendingUp size={20} />

                <div>
                  <strong>
                    Weekly Trends
                  </strong>

                  <span>
                    Compare busy periods
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {loading && (
          <section className="loading-state">
            <div className="loader" />

            <h3>
              Analyzing restaurant...
            </h3>

            <p>
              Fetching Google Maps place
              details and Popular Times.
            </p>
          </section>
        )}

        {venue && !loading && (
          <>
            <section className="venue-card">
              <div className="venue-main">
                <div className="venue-icon">
                  <MapPin size={25} />
                </div>

                <div className="venue-details">
                  <div className="venue-title-row">
                    <h2>
                      {venue.name ||
                        "Unknown restaurant"}
                    </h2>

                    {venue.google_maps_url && (
                      <a
                        href={
                          venue.google_maps_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="maps-link"
                      >
                        Open Maps
                        <ExternalLink
                          size={14}
                        />
                      </a>
                    )}
                  </div>

                  <p className="venue-address">
                    {venue.address ||
                      "Address unavailable"}
                  </p>

                  <div className="venue-meta">
                    <span>
                      <Star
                        size={15}
                        fill="currentColor"
                      />

                      {venue.rating ?? "—"}
                    </span>

                    <span>
                      <Users size={15} />

                      {venue.reviews?.toLocaleString() ||
                        0}{" "}
                      reviews
                    </span>
                  </div>

                  {venue.google_maps_url && (
                    <a
                      href={venue.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="maps-live-btn"
                    >
                      <MapPin size={16} />
                      View Live on Google Maps
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div
                className={`live-status ${getBusyClass(
                  venue.live_busy_percent
                )}`}
              >
                <span className="live-status-label">
                  <span className="pulse-dot" />
                  Live now
                </span>

                <strong>
                  {venue.live_busy_percent !==
                    null &&
                  venue.live_busy_percent !==
                    undefined
                    ? `${venue.live_busy_percent}%`
                    : "—"}
                </strong>

                <span>
                  {venue.live_busy_text ||
                    getBusyLabel(
                      venue.live_busy_percent
                    )}
                </span>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon purple">
                  <Activity size={19} />
                </div>

                <div>
                  <span>
                    Live activity
                  </span>

                  <strong>
                    {venue.live_busy_percent !==
                      null &&
                    venue.live_busy_percent !==
                      undefined
                      ? `${venue.live_busy_percent}%`
                      : "Unavailable"}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">
                  <TrendingUp size={19} />
                </div>

                <div>
                  <span>
                    {
                      DAYS.find(
                        (d) =>
                          d.key ===
                          selectedDay
                      )?.label
                    }{" "}
                    average
                  </span>

                  <strong>
                    {average !== null
                      ? `${average}%`
                      : "Unavailable"}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">
                  <Zap size={19} />
                </div>

                <div>
                  <span>
                    {
                      DAYS.find(
                        (d) =>
                          d.key ===
                          selectedDay
                      )?.label
                    }{" "}
                    peak
                  </span>

                  <strong>
                    {peak
                      ? `${peak.occupancyPercent}%`
                      : "Unavailable"}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">
                  <Clock3 size={19} />
                </div>

                <div>
                  <span>
                    Peak time
                  </span>

                  <strong>
                    {peak
                      ? formatHour(peak.hour)
                      : "Unavailable"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="panel chart-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-kicker">
                      HOURLY ACTIVITY
                    </span>

                    <h3>
                      Popular Times
                    </h3>
                  </div>

                  <div className="day-selector">
                    {DAYS.map((day) => (
                      <button
                        type="button"
                        key={day.key}
                        className={
                          selectedDay ===
                          day.key
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSelectedDay(
                            day.key
                          )
                        }
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPoints.length >
                0 ? (
                  <div className="chart-area">
                    <div className="y-axis">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>

                    <div className="bars-wrapper">
                      <div className="grid-lines">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>

                      <div className="bars">
                        {selectedPoints.map(
                          (point) => (
                            <div
                              className="bar-column"
                              key={`${selectedDay}-${point.hour}`}
                              onMouseEnter={(e) =>
                                showTooltip(
                                  e,
                                  formatHour(point.hour),
                                  `${DAYS.find((d) => d.key === selectedDay)?.label}`,
                                  point.occupancyPercent
                                )
                              }
                              onMouseLeave={hideTooltip}
                              onMouseMove={(e) =>
                                showTooltip(
                                  e,
                                  formatHour(point.hour),
                                  `${DAYS.find((d) => d.key === selectedDay)?.label}`,
                                  point.occupancyPercent
                                )
                              }
                            >
                              <div className="bar-value">
                                {point.occupancyPercent >=
                                55
                                  ? `${point.occupancyPercent}%`
                                  : ""}
                              </div>

                              <div className="bar-track">
                                <div
                                  className={`bar-fill ${getLevelClass(point.occupancyPercent)}`}
                                  style={{
                                    height: `${Math.max(
                                      point.occupancyPercent,
                                      2
                                    )}%`,
                                    background: getBarGradient(point.occupancyPercent),
                                  }}
                                />
                              </div>

                              <span className="bar-label">
                                {point.hour % 3 ===
                                0
                                  ? formatHour(
                                      point.hour
                                    )
                                  : ""}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-data">
                    <BarChart3
                      size={28}
                    />

                    <strong>
                      Popular Times
                      unavailable
                    </strong>

                    <span>
                      Google Maps did not
                      provide hourly data
                      for this day.
                    </span>
                  </div>
                )}
              </div>

              <aside className="panel intelligence-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-kicker">
                      INTELLIGENCE
                    </span>

                    <h3>
                      Quick insights
                    </h3>
                  </div>

                  <div className="ai-badge">
                    AI
                  </div>
                </div>

                <div className="insight-list">
                  <div className="insight">
                    <div className="insight-icon">
                      <TrendingUp
                        size={18}
                      />
                    </div>

                    <div>
                      <strong>
                        Peak period
                      </strong>

                      <p>
                        {peak
                          ? `${formatHour(
                              peak.hour
                            )} reaches ${
                              peak.occupancyPercent
                            }% activity on ${
                              DAYS.find(
                                (d) =>
                                  d.key ===
                                  selectedDay
                              )?.label
                            }.`
                          : "Peak information is unavailable."}
                      </p>
                    </div>
                  </div>

                  <div className="insight">
                    <div className="insight-icon">
                      <Clock3
                        size={18}
                      />
                    </div>

                    <div>
                      <strong>
                        Average activity
                      </strong>

                      <p>
                        {average !==
                        null
                          ? `${average}% average activity for the selected day.`
                          : "Average activity is unavailable."}
                      </p>
                    </div>
                  </div>

                  <div className="insight">
                    <div className="insight-icon">
                      <Users size={18} />
                    </div>

                    <div>
                      <strong>
                        Current status
                      </strong>

                      <p>
                        {venue.live_busy_text ||
                          getBusyLabel(
                            venue.live_busy_percent
                          )}

                        {venue.live_busy_percent !==
                          null &&
                          venue.live_busy_percent !==
                            undefined &&
                          ` at ${venue.live_busy_percent}% activity.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="insight-footer">
                  <MessageCircle
                    size={17}
                  />

                  <span>
                    AI chat can be connected
                    next for
                    restaurant-specific
                    questions.
                  </span>
                </div>
              </aside>
            </section>

            <section className="panel heatmap-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">
                    WEEKLY OVERVIEW
                  </span>

                  <h3>
                    Weekly Popular Times
                  </h3>
                </div>

                <div className="legend">
                  <span>Quiet</span>

                  <i className="level-1" />
                  <i className="level-2" />
                  <i className="level-3" />
                  <i className="level-4" />

                  <span>Busy</span>
                </div>
              </div>

              {heatmapRows.some(
                (row) =>
                  row.points.length > 0
              ) ? (
                <div className="heatmap">
                  <div className="heatmap-hours">
                    <span />
                    <div className="hour-labels">
                      {Array.from(
                        { length: 24 },
                        (_, hour) => (
                          <span
                            key={hour}
                          >
                            {hour % 3 === 0
                              ? formatHour(
                                  hour
                                )
                              : ""}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {heatmapRows.map(
                    (row) => (
                      <div
                        className="heatmap-row"
                        key={row.key}
                      >
                        <div className="heatmap-day">
                          {row.short}
                        </div>

                        <div className="heatmap-cells">
                          {Array.from(
                            { length: 24 },
                            (_, hour) => {
                              const point =
                                row.points.find(
                                  (item) =>
                                    item.hour ===
                                    hour
                                );

                              const value =
                                point?.occupancyPercent ??
                                0;

                              const level =
                                getLevelClass(value);

                              return (
                                <div
                                  key={`${row.key}-${hour}`}
                                  className={`heat-cell ${level}`}
                                  onMouseEnter={(e) =>
                                    showTooltip(
                                      e,
                                      `${row.label} · ${formatHour(hour)}`,
                                      getBusyLabel(value),
                                      value
                                    )
                                  }
                                  onMouseLeave={hideTooltip}
                                  onMouseMove={(e) =>
                                    showTooltip(
                                      e,
                                      `${row.label} · ${formatHour(hour)}`,
                                      getBusyLabel(value),
                                      value
                                    )
                                  }
                                />
                              );
                            }
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="no-data">
                  <Activity
                    size={28}
                  />

                  <strong>
                    Weekly data
                    unavailable
                  </strong>

                  <span>
                    No Popular Times
                    histogram was
                    returned for this
                    venue.
                  </span>
                </div>
              )}
            </section>

            {venue.opening_hours &&
              venue.opening_hours.length >
                0 && (
                <section className="panel hours-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-kicker">
                        VENUE DETAILS
                      </span>

                      <h3>
                        Opening Hours
                      </h3>
                    </div>
                  </div>

                  <div className="hours-grid">
                    {venue.opening_hours.map(
                      (item) => (
                        <div
                          className="hours-item"
                          key={item.day}
                        >
                          <span>
                            {item.day}
                          </span>

                          <strong>
                            {item.hours}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}
          </>
        )}
      </main>

      <footer className="footer">
        <span>
          SpotPulse AI
        </span>

        <span>
          Restaurant intelligence
          powered by live data
        </span>
      </footer>

      {/* Interactive Tooltip */}
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="tooltip-title">
            {tooltip.title}
          </div>
          <div className="tooltip-subtitle">
            {tooltip.subtitle}
          </div>
          <div className="tooltip-percent">
            <span
              className={`tooltip-dot ${getLevelClass(tooltip.percent)}`}
            />
            {tooltip.percent}% · {getBusyLabel(tooltip.percent)}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;