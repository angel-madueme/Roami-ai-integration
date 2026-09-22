import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` auto-append its framework-version notice to our
  // own AGENTS.md — that file is hand-maintained project governance.
  agentRules: false,
};

export default nextConfig;
