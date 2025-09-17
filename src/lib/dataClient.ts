const BASE = "/api";

const j = async (r: Response) => {
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || `HTTP ${r.status}`);
  }
  return r.json();
};

export const getList = (c: string) => 
  fetch(`${BASE}/${c}`, { cache: "no-store" }).then(j);

export const getOne = (c: string, id: string) => 
  fetch(`${BASE}/${c}/${id}`, { cache: "no-store" }).then(j);

export const createOne = (c: string, p: any) => 
  fetch(`${BASE}/${c}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p)
  }).then(j);

export const updateOne = (c: string, id: string, p: any) => 
  fetch(`${BASE}/${c}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p)
  }).then(j);

export const deleteOne = (c: string, id: string) => 
  fetch(`${BASE}/${c}/${id}`, { method: "DELETE" }).then(j);

export const getHealth = () => 
  fetch(`${BASE}/admin/health`, { cache: "no-store" }).then(j);
