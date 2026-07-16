import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type ActiveChild = {
  id: string;
  first_name: string;
  nickname: string | null;
  gender: string | null;
  date_of_birth: string | null;
  portrait_url: string | null;
  streak_count: number;
  last_story_read_date: string | null;
};

type Ctx = {
  loading: boolean;
  children: ActiveChild[];
  activeChild: ActiveChild | null;
  setActiveChildId: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const ActiveChildCtx = createContext<Ctx>({
  loading: true,
  children: [],
  activeChild: null,
  setActiveChildId: async () => {},
  refresh: async () => {},
});

export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [list, setList] = useState<ActiveChild[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setList([]);
      setActiveId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [kidsRes, profileRes] = await Promise.all([
      supabase
        .from("children")
        .select(
          "id, first_name, nickname, gender, date_of_birth, portrait_url, streak_count, last_story_read_date",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("active_child_id")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    const rows = (kidsRes.data ?? []) as ActiveChild[];
    setList(rows);

    let active: string | null = profileRes.data?.active_child_id ?? null;
    if (active && !rows.find((r) => r.id === active)) active = null;
    if (!active && rows.length > 0) {
      active = rows[0].id;
      await supabase
        .from("profiles")
        .update({ active_child_id: active })
        .eq("id", user.id);
    }
    setActiveId(active);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const setActiveChildId = useCallback(
    async (id: string) => {
      setActiveId(id);
      if (user) {
        await supabase
          .from("profiles")
          .update({ active_child_id: id })
          .eq("id", user.id);
      }
    },
    [user],
  );

  const activeChild = list.find((c) => c.id === activeId) ?? null;

  return (
    <ActiveChildCtx.Provider
      value={{
        loading,
        children: list,
        activeChild,
        setActiveChildId,
        refresh: load,
      }}
    >
      {children}
    </ActiveChildCtx.Provider>
  );
}

export function useActiveChild() {
  return useContext(ActiveChildCtx);
}
