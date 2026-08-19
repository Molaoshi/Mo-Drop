import { useEffect, useState } from "react";
import { Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Drop from "@/pages/Drop";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Files from "@/pages/Files";
import Brand from "@/pages/Brand";
import Vault from "@/pages/Vault";
import { apiMe } from "@/lib/api";

export default function App() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    apiMe().then((ok) => setAuth(ok ? "in" : "out"));
  }, []);

  if (auth === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="micro-label animate-pulse">Loading…</span>
      </div>
    );
  }

  if (auth === "out") {
    return <Login onAuth={() => setAuth("in")} />;
  }

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Drop />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/files" element={<Files />} />
          <Route path="/brand" element={<Brand />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="*" element={<Drop />} />
        </Route>
      </Routes>
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
