export const API_URL = "http://localhost:8000";
export async function searchVenue(query: string) {
  const res = await fetch(`${API_URL}/api/places/search`, {
    method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({query})
  });
  return res.json();
}
