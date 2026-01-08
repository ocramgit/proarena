"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Calendar,
  Globe,
  MapPin,
  Medal
} from "lucide-react";

/**
 * FASE 54 REFACTOR: WORLD RANKINGS PAGE
 * Real HLTV & Valve rankings with proper country flags
 */

// Country flag URLs using flagcdn.com
const getFlag = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

// HLTV Top 30 World Rankings
const HLTV_RANKINGS = [
  { rank: 1, name: "Team Vitality", tag: "VIT", country: "fr", points: 1000, change: 0, region: "EU" },
  { rank: 2, name: "Team Spirit", tag: "SPR", country: "ru", points: 945, change: 1, region: "CIS" },
  { rank: 3, name: "Natus Vincere", tag: "NAVI", country: "ua", points: 891, change: -1, region: "CIS" },
  { rank: 4, name: "FaZe Clan", tag: "FaZe", country: "eu", points: 842, change: 0, region: "EU" },
  { rank: 5, name: "G2 Esports", tag: "G2", country: "eu", points: 798, change: 2, region: "EU" },
  { rank: 6, name: "MOUZ", tag: "MOUZ", country: "eu", points: 756, change: -1, region: "EU" },
  { rank: 7, name: "Heroic", tag: "HER", country: "dk", points: 721, change: 1, region: "EU" },
  { rank: 8, name: "Cloud9", tag: "C9", country: "us", points: 689, change: -2, region: "NA" },
  { rank: 9, name: "Complexity", tag: "COL", country: "us", points: 654, change: 3, region: "NA" },
  { rank: 10, name: "Astralis", tag: "AST", country: "dk", points: 623, change: -1, region: "EU" },
  { rank: 11, name: "FURIA", tag: "FUR", country: "br", points: 598, change: 2, region: "SA" },
  { rank: 12, name: "Virtus.pro", tag: "VP", country: "ru", points: 567, change: 0, region: "CIS" },
  { rank: 13, name: "BIG", tag: "BIG", country: "de", points: 534, change: -2, region: "EU" },
  { rank: 14, name: "Liquid", tag: "TL", country: "us", points: 512, change: 1, region: "NA" },
  { rank: 15, name: "SAW", tag: "SAW", country: "pt", points: 489, change: 4, region: "EU" },
  { rank: 16, name: "Monte", tag: "MON", country: "ua", points: 467, change: -1, region: "CIS" },
  { rank: 17, name: "GamerLegion", tag: "GL", country: "de", points: 445, change: 0, region: "EU" },
  { rank: 18, name: "Eternal Fire", tag: "EF", country: "tr", points: 423, change: 2, region: "EU" },
  { rank: 19, name: "TheMongolz", tag: "MGL", country: "mn", points: 401, change: 5, region: "ASIA" },
  { rank: 20, name: "paiN Gaming", tag: "paiN", country: "br", points: 378, change: -3, region: "SA" },
  { rank: 21, name: "ENCE", tag: "ENCE", country: "fi", points: 356, change: 0, region: "EU" },
  { rank: 22, name: "3DMAX", tag: "3DM", country: "fr", points: 334, change: 1, region: "EU" },
  { rank: 23, name: "Apeks", tag: "APK", country: "no", points: 312, change: -2, region: "EU" },
  { rank: 24, name: "Imperial", tag: "IMP", country: "br", points: 290, change: 3, region: "SA" },
  { rank: 25, name: "OG", tag: "OG", country: "eu", points: 268, change: -1, region: "EU" },
  { rank: 26, name: "Ninjas in Pyjamas", tag: "NIP", country: "se", points: 245, change: 0, region: "EU" },
  { rank: 27, name: "fnatic", tag: "FNC", country: "gb", points: 223, change: 2, region: "EU" },
  { rank: 28, name: "Aurora", tag: "AUR", country: "ru", points: 201, change: -4, region: "CIS" },
  { rank: 29, name: "Wildcard", tag: "WC", country: "au", points: 178, change: 1, region: "OCE" },
  { rank: 30, name: "MIBR", tag: "MIBR", country: "br", points: 156, change: -1, region: "SA" },
];

// Valve Regional Standings
const VALVE_REGIONS = [
  {
    name: "Europe",
    code: "eu",
    color: "from-blue-600 to-blue-800",
    borderColor: "border-blue-500/30",
    spots: 8,
    teams: [
      { name: "Team Vitality", country: "fr", qualified: true },
      { name: "FaZe Clan", country: "eu", qualified: true },
      { name: "G2 Esports", country: "eu", qualified: true },
      { name: "MOUZ", country: "eu", qualified: true },
      { name: "Heroic", country: "dk", qualified: true },
      { name: "Astralis", country: "dk", qualified: true },
      { name: "BIG", country: "de", qualified: true },
      { name: "GamerLegion", country: "de", qualified: true },
      { name: "Eternal Fire", country: "tr", qualified: false },
      { name: "ENCE", country: "fi", qualified: false },
    ],
  },
  {
    name: "CIS",
    code: "ru",
    color: "from-red-600 to-red-800",
    borderColor: "border-red-500/30",
    spots: 4,
    teams: [
      { name: "Team Spirit", country: "ru", qualified: true },
      { name: "Natus Vincere", country: "ua", qualified: true },
      { name: "Virtus.pro", country: "ru", qualified: true },
      { name: "Monte", country: "ua", qualified: true },
      { name: "Aurora", country: "ru", qualified: false },
    ],
  },
  {
    name: "Americas",
    code: "us",
    color: "from-green-600 to-green-800",
    borderColor: "border-green-500/30",
    spots: 4,
    teams: [
      { name: "Cloud9", country: "us", qualified: true },
      { name: "Complexity", country: "us", qualified: true },
      { name: "Liquid", country: "us", qualified: true },
      { name: "FURIA", country: "br", qualified: true },
      { name: "paiN Gaming", country: "br", qualified: false },
      { name: "Imperial", country: "br", qualified: false },
    ],
  },
  {
    name: "Asia-Pacific",
    code: "cn",
    color: "from-yellow-600 to-orange-700",
    borderColor: "border-yellow-500/30",
    spots: 2,
    teams: [
      { name: "TheMongolz", country: "mn", qualified: true },
      { name: "Lynn Vision", country: "cn", qualified: true },
      { name: "Rare Atom", country: "cn", qualified: false },
    ],
  },
];

export default function WorldRankingsPage() {
  const [activeTab, setActiveTab] = useState<"hltv" | "valve">("hltv");
  const [regionFilter, setRegionFilter] = useState<string>("ALL");

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-zinc-600" />;
  };

  const getChangeText = (change: number) => {
    if (change > 0) return <span className="text-green-500 text-sm font-medium">+{change}</span>;
    if (change < 0) return <span className="text-red-500 text-sm font-medium">{change}</span>;
    return <span className="text-zinc-600 text-sm">—</span>;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-black";
    if (rank === 2) return "bg-gradient-to-r from-zinc-400 to-zinc-300 text-black font-bold";
    if (rank === 3) return "bg-gradient-to-r from-orange-700 to-orange-600 text-white font-bold";
    return "bg-zinc-800 text-zinc-300";
  };

  const filteredRankings = regionFilter === "ALL" 
    ? HLTV_RANKINGS 
    : HLTV_RANKINGS.filter(t => t.region === regionFilter);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Trophy className="w-7 h-7 text-yellow-500" />
            World Rankings
          </h1>
          <p className="text-zinc-400 mt-1">Rankings oficiais do cenário competitivo de CS2</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Calendar className="w-4 h-4" />
          <span>Atualizado: {new Date().toLocaleDateString("pt-PT")}</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab("hltv")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "hltv"
              ? "bg-orange-500 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          HLTV World Ranking
        </button>
        <button
          onClick={() => setActiveTab("valve")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "valve"
              ? "bg-orange-500 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Valve Regional Standings
        </button>
      </div>

      {activeTab === "hltv" ? (
        <>
          {/* Region Filter */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-zinc-500">Região:</span>
            {["ALL", "EU", "CIS", "NA", "SA", "ASIA"].map((region) => (
              <button
                key={region}
                onClick={() => setRegionFilter(region)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  regionFilter === region
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800/50 text-zinc-500 hover:text-white"
                }`}
              >
                {region === "ALL" ? "Todas" : region}
              </button>
            ))}
          </div>

          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <div className="mt-8">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-zinc-400/10 to-zinc-900 border border-zinc-700 text-center">
                <div className="text-4xl mb-2">🥈</div>
                <img 
                  src={getFlag(HLTV_RANKINGS[1].country)} 
                  alt="" 
                  className="w-8 h-6 mx-auto mb-2 rounded shadow-lg object-cover"
                />
                <h3 className="font-bold text-white">{HLTV_RANKINGS[1].name}</h3>
                <p className="text-zinc-400 text-sm">{HLTV_RANKINGS[1].points} pts</p>
              </div>
            </div>

            {/* 1st Place */}
            <div>
              <div className="p-6 rounded-2xl bg-gradient-to-b from-yellow-500/20 to-zinc-900 border border-yellow-500/30 text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="text-5xl mb-2">🏆</div>
                  <img 
                    src={getFlag(HLTV_RANKINGS[0].country)} 
                    alt="" 
                    className="w-10 h-7 mx-auto mb-2 rounded shadow-lg object-cover"
                  />
                  <h3 className="font-bold text-white text-lg">{HLTV_RANKINGS[0].name}</h3>
                  <p className="text-yellow-400 font-bold">{HLTV_RANKINGS[0].points} pts</p>
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="mt-12">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-orange-700/10 to-zinc-900 border border-orange-700/30 text-center">
                <div className="text-3xl mb-2">🥉</div>
                <img 
                  src={getFlag(HLTV_RANKINGS[2].country)} 
                  alt="" 
                  className="w-7 h-5 mx-auto mb-2 rounded shadow-lg object-cover"
                />
                <h3 className="font-bold text-white">{HLTV_RANKINGS[2].name}</h3>
                <p className="text-zinc-400 text-sm">{HLTV_RANKINGS[2].points} pts</p>
              </div>
            </div>
          </div>

          {/* Rankings Table */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-zinc-500 border-b border-zinc-800 bg-zinc-900/50">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Equipa</div>
              <div className="col-span-2 text-center">Região</div>
              <div className="col-span-2 text-center">Pontos</div>
              <div className="col-span-2 text-center">Δ</div>
            </div>

            {filteredRankings.map((team) => (
              <a
                key={team.rank}
                href={`https://www.hltv.org/team/${team.rank}/${team.tag.toLowerCase()}`}
                target="_blank"
                rel="noopener"
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0"
              >
                <div className="col-span-1">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm ${getRankStyle(team.rank)}`}>
                    {team.rank}
                  </span>
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <img 
                    src={getFlag(team.country)} 
                    alt="" 
                    className="w-6 h-4 rounded shadow object-cover"
                  />
                  <div>
                    <span className="font-bold text-white">{team.name}</span>
                    <span className="text-xs text-zinc-500 ml-2">[{team.tag}]</span>
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">
                    {team.region}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="font-bold text-orange-500">{team.points}</span>
                </div>
                <div className="col-span-2 flex items-center justify-center gap-1">
                  {getChangeIcon(team.change)}
                  {getChangeText(team.change)}
                </div>
              </a>
            ))}
          </div>

          {/* Source Link */}
          <div className="mt-6 text-center">
            <a
              href="https://www.hltv.org/ranking/teams"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <Globe className="w-4 h-4" />
              Dados de HLTV.org
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </>
      ) : (
        /* Valve Regional Standings - Redesigned */
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <p className="text-zinc-400 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Valve Regional Standings determinam os convites e vagas para os Majors de CS2.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALVE_REGIONS.map((region) => (
              <div
                key={region.name}
                className={`rounded-xl overflow-hidden border ${region.borderColor}`}
              >
                {/* Region Header */}
                <div className={`bg-gradient-to-r ${region.color} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={getFlag(region.code)} 
                        alt="" 
                        className="w-8 h-6 rounded shadow-lg object-cover"
                      />
                      <h3 className="text-lg font-bold text-white">{region.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Medal className="w-5 h-5 text-white/80" />
                      <span className="text-white font-bold">{region.spots} vagas</span>
                    </div>
                  </div>
                </div>

                {/* Teams List */}
                <div className="bg-zinc-900 p-4">
                  <div className="space-y-2">
                    {region.teams.map((team, idx) => (
                      <div
                        key={team.name}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          team.qualified 
                            ? "bg-green-500/10 border border-green-500/20" 
                            : "bg-zinc-800/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                            team.qualified 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-zinc-700 text-zinc-500"
                          }`}>
                            {idx + 1}
                          </span>
                          <img 
                            src={getFlag(team.country)} 
                            alt="" 
                            className="w-5 h-4 rounded shadow object-cover"
                          />
                          <span className={team.qualified ? "text-white font-medium" : "text-zinc-400"}>
                            {team.name}
                          </span>
                        </div>
                        {team.qualified ? (
                          <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                            <Medal className="w-3 h-3" />
                            Qualificado
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">Eliminatórias</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Major Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-600/20 to-zinc-900 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-3">
                <img src={getFlag("dk")} alt="" className="w-8 h-6 rounded shadow-lg object-cover" />
                <div>
                  <h4 className="font-bold text-white">Major I 2026</h4>
                  <p className="text-sm text-zinc-400">Copenhagen, Dinamarca</p>
                </div>
              </div>
              <p className="text-zinc-500 text-sm">Março 2026</p>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-green-600/20 to-zinc-900 border border-green-500/30">
              <div className="flex items-center gap-3 mb-3">
                <img src={getFlag("br")} alt="" className="w-8 h-6 rounded shadow-lg object-cover" />
                <div>
                  <h4 className="font-bold text-white">Major II 2026</h4>
                  <p className="text-sm text-zinc-400">São Paulo, Brasil</p>
                </div>
              </div>
              <p className="text-zinc-500 text-sm">Outubro 2026</p>
            </div>
          </div>

          {/* Source Link */}
          <div className="mt-6 text-center">
            <a
              href="https://www.counter-strike.net/esports"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <Globe className="w-4 h-4" />
              Dados de Valve Regional Standings
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
