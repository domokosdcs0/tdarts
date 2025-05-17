import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Group } from "./TournamentDetailsPage";

interface GroupSectionProps {
  groups: Group[];
  getEliminatedPlayers: (groupIndex: number) => string[];
  matchFilter: "all" | "pending" | "ongoing" | "finished";
  setMatchFilter: (filter: "all" | "pending" | "ongoing" | "finished") => void;
  tournamentEndDate?: string;
}

function GroupSection({ groups, getEliminatedPlayers, matchFilter, setMatchFilter, tournamentEndDate }: GroupSectionProps) {
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [expandedMatches, setExpandedMatches] = useState<{ [key: string]: boolean }>({});
  const [pinnedGroupId, setPinnedGroupId] = useState<string | null>(null);

  useEffect(() => {
    const storedPinnedGroup = localStorage.getItem("pinnedGroup");
    if (storedPinnedGroup) {
      setPinnedGroupId(storedPinnedGroup);
    }
  }, []);

  useEffect(() => {
    if (tournamentEndDate) {
      const endDate = new Date(tournamentEndDate).getTime();
      const now = new Date().getTime();
      if (now > endDate) {
        localStorage.removeItem("pinnedGroup");
        setPinnedGroupId(null);
      }
    }
  }, [tournamentEndDate]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleMatches = (groupId: string) => {
    setExpandedMatches((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handlePinGroup = (groupId: string) => {
    if (pinnedGroupId === groupId) {
      localStorage.removeItem("pinnedGroup");
      setPinnedGroupId(null);
    } else {
      localStorage.setItem("pinnedGroup", groupId);
      setPinnedGroupId(groupId);
    }
  };

  // Split groups into expanded and collapsed, prioritizing pinned group
  const expandedGroupList: { group: Group; index: number }[] = [];
  const collapsedGroupList: { group: Group; index: number }[] = [];
  groups.forEach((group, index) => {
    if (expandedGroups[group._id]) {
      expandedGroupList.push({ group, index });
    } else {
      collapsedGroupList.push({ group, index });
    }
  });

  // Sort to prioritize pinned group
  const sortGroups = (list: { group: Group; index: number }[]) =>
    [...list].sort((a, b) => {
      if (pinnedGroupId === a.group._id) return -1;
      if (pinnedGroupId === b.group._id) return 1;
      return 0;
    });

  const sortedExpandedGroups = sortGroups(expandedGroupList);
  const sortedCollapsedGroups = sortGroups(collapsedGroupList);

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto", transition: { duration: 0.3, ease: "easeInOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  };

  const matchesVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto", transition: { duration: 0.3, ease: "easeInOut" } },
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold">Csoportok</h2>
      {groups.length === 0 ? (
        <p>Nincsenek még csoportok kiosztva.</p>
      ) : (
        <div className="space-y-4 mt-4">
          <AnimatePresence>
            {/* Expanded groups (full width) */}
            {sortedExpandedGroups.map(({ group, index }) => {
              const eliminatedPlayers = getEliminatedPlayers(index);
              const isMatchesExpanded = expandedMatches[group._id] || false;

              return (
                <motion.div
                  key={group._id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="card bg-base-200 shadow-md w-full"
                >
                  <div className="card-body">
                    <div className="flex justify-between items-center">
                      <h3 className="card-title">
                        Csoport {index + 1} (Tábla {index + 1})
                        {pinnedGroupId === group._id && (
                          <span className="ml-2 text-yellow-500">📍</span>
                        )}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handlePinGroup(group._id)}
                          title={pinnedGroupId === group._id ? "Kitűzés megszüntetése" : "Csoport kitűzése"}
                        >
                          {pinnedGroupId === group._id ? "🧷" : "📌"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleGroup(group._id)}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${expandedGroups[group._id] ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-scroll">
                      <table className="table w-full">
                        <thead>
                          <tr>
                            <th>Helyezés</th>
                            <th>Név</th>
                            <th>Pontok</th>
                            <th>Legek</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.players && group.players.length > 0 ? (
                            group.players
                              .map((player) => {
                                const standing = group.standings?.find(
                                  (s) => s.playerId._id.toString() === player.playerId._id.toString()
                                );
                                return {
                                  player,
                                  standing,
                                  rank: standing?.rank || Infinity,
                                };
                              })
                              .sort((a, b) => a.rank - b.rank)
                              .map(({ player, standing }, index) => {
                                const isEliminated = eliminatedPlayers.includes(player.playerId._id.toString());
                                return (
                                  <tr
                                    key={player.playerId._id}
                                    className={isEliminated ? "bg-red-800 text-white" : ""}
                                  >
                                    <td>{standing?.rank || "-"}</td>
                                    <td>{player.playerId.name || "Ismeretlen"}</td>
                                    <td>{standing?.points || 0}</td>
                                    <td>{standing ? `${standing.legsWon}/${standing.legsLost}` : "-"}</td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan={4}>Nincsenek játékosok a csoportban.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4">
                      <button
                        className="btn shadow-md btn-sm w-full flex justify-between items-center"
                        onClick={() => toggleMatches(group._id)}
                      >
                        <span>Mérkőzések</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isMatchesExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {isMatchesExpanded && (
                          <motion.div
                            variants={matchesVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="mt-4"
                          >
                            <div className="mb-4 flex flex-col items-start gap-2">
                              <label className="label">
                                <span className="label-text">Szűrés állapot szerint:</span>
                              </label>
                              <select
                                className="select select-sm select-bordered"
                                value={matchFilter}
                                onChange={(e) => setMatchFilter(e.target.value as any)}
                              >
                                <option value="all">Összes</option>
                                <option value="pending">Függőben</option>
                                <option value="ongoing">Folyamatban</option>
                                <option value="finished">Befejezve</option>
                              </select>
                            </div>
                            {group.matches && group.matches.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="table w-full">
                                  <thead>
                                    <tr>
                                      <th>Sorszám</th>
                                      <th>Játékosok</th>
                                      <th>Pontozó</th>
                                      <th>Állapot</th>
                                      <th>Eredmény</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.matches
                                      .filter((match) =>
                                        matchFilter === "all" ? true : match.status === matchFilter
                                      )
                                      .map((match, matchIndex) => (
                                        <tr key={match._id || matchIndex}>
                                          <td>{matchIndex + 1}</td>
                                          <td>
                                            {(match.player1?.name || "Ismeretlen")} vs{" "}
                                            {(match.player2?.name || "Ismeretlen")}
                                          </td>
                                          <td>{match.scorer?.name || "Nincs"}</td>
                                          <td>
                                            <span
                                              className={`badge ${
                                                match.status === "pending"
                                                  ? "badge-warning"
                                                  : match.status === "ongoing"
                                                  ? "badge-info"
                                                  : "badge-success"
                                              }`}
                                            >
                                              {match.status === "pending"
                                                ? "Függőben"
                                                : match.status === "ongoing"
                                                ? "Folyamatban"
                                                : "Befejezve"}
                                            </span>
                                          </td>
                                          <td>
                                            {(match.status === "finished" || match.status === "ongoing") &&
                                            match.stats ? (
                                              <span className="badge badge-neutral">
                                                {match.stats.player1.legsWon}-{match.stats.player2.legsWon}
                                              </span>
                                            ) : (
                                              "-"
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p>Nincsenek mérkőzések a csoportban.</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {/* Collapsed groups (narrower, wrapped) */}
            {sortedCollapsedGroups.length > 0 && (
              <motion.div
                key="collapsed-groups"
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-wrap gap-4"
              >
                {sortedCollapsedGroups.map(({ group, index }) => {
                  const eliminatedPlayers = getEliminatedPlayers(index);

                  return (
                    <motion.div
                      key={group._id}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="card bg-base-100 shadow-md w-80 min-w-[theme(spacing.64)]"
                    >
                      <div className="card-body p-4">
                        <div className="flex justify-between items-center">
                          <h3 className="card-title text-base">
                            Csoport {index + 1} (Tábla {index + 1})
                            {pinnedGroupId === group._id && (
                              <span className="ml-2 text-yellow-500">📍</span>
                            )}
                          </h3>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handlePinGroup(group._id)}
                              title={pinnedGroupId === group._id ? "Kitűzés megszüntetése" : "Csoport kitűzése"}
                            >
                              {pinnedGroupId === group._id ? "🧷" : "📌"}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => toggleGroup(group._id)}
                            >
                              <svg
                                className="w-4 h-4 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <table className="table w-full compact">
                            <tbody>
                              {group.players && group.players.length > 0 ? (
                                group.players
                                  .map((player) => {
                                    const standing = group.standings?.find(
                                      (s) => s.playerId._id.toString() === player.playerId._id.toString()
                                    );
                                    return {
                                      player,
                                      standing,
                                      rank: standing?.rank || Infinity,
                                    };
                                  })
                                  .sort((a, b) => a.rank - b.rank)
                                  .map(({ player, standing }, index) => {
                                    const isEliminated = eliminatedPlayers.includes(player.playerId._id.toString());
                                    return (
                                      <tr
                                        key={player.playerId._id}
                                        className={isEliminated ? "bg-red-800 text-white" : ""}
                                      >
                                        <td className="text-sm">{standing?.rank || "-"}</td>
                                        <td className="text-sm">{player.playerId.name || "Ismeretlen"}</td>
                                      </tr>
                                    );
                                  })
                              ) : (
                                <tr>
                                  <td colSpan={2}>Nincsenek játékosok a csoportban.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default GroupSection;