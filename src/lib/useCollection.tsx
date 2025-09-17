import { useEffect, useState, useCallback } from "react";
import { getList, createOne, updateOne, deleteOne } from "./dataClient";

export function useCollection(collection: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(() => {
    setLoading(true);
    setError(undefined);
    getList(collection)
      .then(setData)
      .catch(e => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [collection]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = async (p: any) => {
    const res = await createOne(collection, p);
    setData(d => [...d, res]);
    return res;
  };

  const update = async (id: string, p: any) => {
    const res = await updateOne(collection, id, p);
    setData(d => d.map(x => x.id === id ? res : x));
    return res;
  };

  const remove = async (id: string) => {
    await deleteOne(collection, id);
    setData(d => d.filter(x => x.id !== id));
  };

  return { data, loading, error, reload, create, update, remove };
}
