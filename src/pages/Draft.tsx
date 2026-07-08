import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { DraftSettings, Player, Position, RealPlayerRecord, Team, ClubSeason } from '../types';
import { REROLLS_BY_DIFFICULTY } from '../types';
import { FORMATION_SLOTS } from '../data/formations';
import { getClub } from '../data/leagues';
import {
  loadIndex, filterEntries, pickRandomEntry, loadClubSeason,
  isPositionCompatible, realPlayerToEnginePlayer, type ClubSeasonIndexEntry,
} from '../data/historicalData';
import { PitchDiagram, type PitchSlotContent } from '../components/pitch/PitchDiagram';
import { putPlayers, putTeam } from '../storage/cache';
import { useAppDispatch } from '../state/AppContext';

const COLOR_PAIRS: [string, string][] = [
  ['#dc2626', '#111827'], ['#2563eb', '#f8fafc'], ['#16a34a', '#f8fafc'],
  ['#7c3aed', '#f8fafc'], ['#ea580c', '#111827'], ['#0891b2', '#111827'],
];

interface FilledSlot {
  player: Player;
  clubName: string;
  season: string;
}

export default function Draft() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const settings = location.state as DraftSettings | null;

  const [entries, setEntries] = useState<ClubSeasonIndexEntry[] | null>(null);
  const [filled, setFilled] = useState<(FilledSlot | null)[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [spinLabel, setSpinLabel] = useState('');
  const [currentClubSeason, setCurrentClubSeason] = useState<ClubSeason | null>(null);
  const [pendingRecord, setPendingRecord] = useState<RealPlayerRecord | null>(null);
  const [rerollsLeft, setRerollsLeft] = useState(0);
  const [teamName, setTeamName] = useState('My All-Time XI');
  const [colorIndex, setColorIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastClubIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!settings) { navigate('/setup'); return; }
    loadIndex().then(setEntries);
    setFilled(new Array(FORMATION_SLOTS[settings.formation].length).fill(null));
    setRerollsLeft(REROLLS_BY_DIFFICULTY[settings.difficulty]);
  }, [settings, navigate]);

  useEffect(() => () => { if (spinTimer.current) clearInterval(spinTimer.current); }, []);

  const slots = useMemo(() => (settings ? FORMATION_SLOTS[settings.formation] : []), [settings]);
  const openSlotIndexes = useMemo(() => filled.map((f, i) => (f ? -1 : i)).filter((i) => i !== -1), [filled]);
  const allFilled = openSlotIndexes.length === 0 && filled.length > 0;

  const eligibleEntries = useMemo(() => {
    if (!settings || !entries) return [];
    return filterEntries(entries, { leagueIds: settings.leagueIds, seasonMin: settings.seasonMin, seasonMax: settings.seasonMax });
  }, [settings, entries]);

  const targetBroadPositions = useMemo(() => {
    if (!settings) return null;
    if (settings.draftMode === 'position-first' && selectedSlot !== null) {
      return new Set([slots[selectedSlot].position]);
    }
    return null; // squad-first: any position compatible with any open slot is fine
  }, [settings, selectedSlot, slots]);

  const canSpin = settings?.draftMode === 'squad-first' ? openSlotIndexes.length > 0 : selectedSlot !== null;

  /**
   * 38-0-style wheel: pick a club uniformly (so clubs with more scraped seasons don't dominate),
   * then a random season for that club — avoiding the previously-landed club when possible.
   */
  const pickSpinTarget = (): ClubSeasonIndexEntry | null => {
    const byClub = new Map<string, ClubSeasonIndexEntry[]>();
    for (const entry of eligibleEntries) {
      const list = byClub.get(entry.clubId);
      if (list) list.push(entry);
      else byClub.set(entry.clubId, [entry]);
    }
    let clubIds = Array.from(byClub.keys());
    if (clubIds.length === 0) return null;
    if (clubIds.length > 1 && lastClubIdRef.current) {
      clubIds = clubIds.filter((id) => id !== lastClubIdRef.current);
    }
    const clubId = clubIds[Math.floor(Math.random() * clubIds.length)];
    const seasons = byClub.get(clubId)!;
    return seasons[Math.floor(Math.random() * seasons.length)];
  };

  const handleSpin = () => {
    if (!settings || eligibleEntries.length === 0 || !canSpin) return;
    setSpinning(true);
    setCurrentClubSeason(null);
    setPendingRecord(null);

    let ticks = 0;
    spinTimer.current = setInterval(() => {
      const random = pickRandomEntry(eligibleEntries);
      if (random) {
        const club = getClub(random.clubId);
        setSpinLabel(`${club?.name ?? random.clubId} ${random.season}`);
      }
      ticks += 1;
      if (ticks > 14) {
        if (spinTimer.current) clearInterval(spinTimer.current);
        finishSpin();
      }
    }, 80);
  };

  const finishSpin = async () => {
    if (!settings) return;
    const entry = pickSpinTarget();
    if (!entry) { setSpinning(false); return; }
    lastClubIdRef.current = entry.clubId;
    const clubSeason = await loadClubSeason(entry.leagueId, entry.clubId, entry.season);
    setCurrentClubSeason(clubSeason);
    setSpinning(false);
  };

  const handleReroll = () => {
    if (rerollsLeft <= 0) return;
    setRerollsLeft((r) => r - 1);
    setCurrentClubSeason(null);
    setPendingRecord(null);
    handleSpin();
  };

  const placeIntoSlot = (record: RealPlayerRecord, targetIndex: number) => {
    if (!settings || !currentClubSeason) return;
    const slotPosition: Position = slots[targetIndex].position;
    if (!isPositionCompatible(record.broadPosition, slotPosition)) return;

    const player = realPlayerToEnginePlayer(record, slotPosition, settings.ratingsMode, currentClubSeason);
    const club = getClub(currentClubSeason.clubId);

    setFilled((prev) => {
      const next = [...prev];
      next[targetIndex] = { player, clubName: club?.name ?? currentClubSeason.clubId, season: currentClubSeason.season };
      return next;
    });
    setCurrentClubSeason(null);
    setPendingRecord(null);
    setSelectedSlot(null);
  };

  /**
   * 38-0 flow: pick the player first, then choose which compatible open slot to put them in.
   * In position-first mode the slot was already chosen, so the pick places immediately.
   */
  const draftPlayer = (record: RealPlayerRecord) => {
    if (!settings || !currentClubSeason) return;

    if (settings.draftMode === 'position-first' && selectedSlot !== null) {
      placeIntoSlot(record, selectedSlot);
      return;
    }

    const compatibleOpen = openSlotIndexes.filter((i) => isPositionCompatible(record.broadPosition, slots[i].position));
    if (compatibleOpen.length === 0) return;
    if (compatibleOpen.length === 1) {
      placeIntoSlot(record, compatibleOpen[0]);
      return;
    }
    setPendingRecord(record);
  };

  const removeSlot = (index: number) => {
    setFilled((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!settings || !allFilled) return;
    setSaving(true);
    const teamId = `team-user-${Date.now()}`;
    const [primary, secondary] = COLOR_PAIRS[colorIndex];
    const players = filled.map((f) => f!.player);

    const team: Team = {
      id: teamId,
      name: teamName.trim() || 'My All-Time XI',
      shortName: (teamName.trim() || 'XI').slice(0, 3).toUpperCase(),
      country: 'INT',
      crest: { shape: 'shield', primaryColor: primary, secondaryColor: secondary, icon: 'shield' },
      colors: { primary, secondary },
      squad: players.map((p) => p.id),
      formation: settings.formation,
      isUserCreated: true,
      isProcedural: false,
    };

    await putPlayers(players);
    await putTeam(team);
    dispatch({ type: 'SET_CURRENT_TEAM', teamId });
    navigate('/season');
  };

  if (!settings) return null;

  const pitchContent: PitchSlotContent[] = slots.map((slot, i) => {
    const f = filled[i];
    if (f) {
      return { label: f.player.lastName.slice(0, 8), sublabel: settings.showRatings ? `${f.player.ratings.overall} OVR` : undefined, filled: true };
    }
    const highlighted = pendingRecord
      ? isPositionCompatible(pendingRecord.broadPosition, slot.position)
      : settings.draftMode === 'position-first' && selectedSlot === i;
    return { label: slot.position, filled: false, highlighted };
  });

  const handleSlotClick = (i: number) => {
    if (pendingRecord && !filled[i] && isPositionCompatible(pendingRecord.broadPosition, slots[i].position)) {
      placeIntoSlot(pendingRecord, i);
      return;
    }
    if (filled[i]) { removeSlot(i); return; }
    if (settings.draftMode === 'position-first') setSelectedSlot(i);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 text-neutral-100">
      <h1 className="text-3xl font-bold">Draft your XI</h1>
      <p className="mt-1 text-neutral-400">
        {settings.draftMode === 'squad-first' ? 'Spin a club-season, draft any player who fits an open slot.' : 'Pick an open slot, then spin for a club-season to fill it.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          maxLength={24}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-semibold text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={() => setColorIndex((i) => (i + 1) % COLOR_PAIRS.length)}
          className="h-8 w-8 rounded-full border border-neutral-600"
          style={{ backgroundColor: COLOR_PAIRS[colorIndex][0] }}
          aria-label="Change color"
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <PitchDiagram
            formation={settings.formation}
            slotContent={pitchContent}
            onSlotClick={handleSlotClick}
          />
          <p className="mt-2 text-center text-xs text-neutral-500">
            {pendingRecord
              ? `Placing ${pendingRecord.name} — tap a highlighted slot.`
              : settings.draftMode === 'position-first'
                ? 'Click an empty slot to select it, or a filled one to clear it.'
                : 'Click a filled slot to clear it.'}
          </p>
          {pendingRecord && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-sm font-semibold text-amber-300">
                {pendingRecord.name}
                {settings.showRatings && ` · ${settings.ratingsMode === 'prime' ? pendingRecord.primeRatings.overall : pendingRecord.seasonRatings.overall} OVR`}
              </span>
              <button
                type="button"
                onClick={() => setPendingRecord(null)}
                className="rounded border border-neutral-600 px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div>
          {!currentClubSeason && !spinning && (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-neutral-700 bg-neutral-900 p-8 text-center">
              <p className="text-neutral-400">
                {allFilled ? 'Squad complete!' : eligibleEntries.length === 0 ? 'No club-seasons match your settings.' : 'Ready to spin.'}
              </p>
              {!allFilled && (
                <button
                  type="button"
                  onClick={handleSpin}
                  disabled={!canSpin || eligibleEntries.length === 0}
                  className="rounded-lg bg-emerald-600 px-6 py-3 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  🎡 Spin
                </button>
              )}
            </div>
          )}

          {spinning && (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 p-8 text-center">
              <div className="text-2xl font-bold text-emerald-400">{spinLabel}</div>
              <p className="text-xs text-neutral-500">Spinning…</p>
            </div>
          )}

          {currentClubSeason && !spinning && (
            <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {getClub(currentClubSeason.clubId)?.name ?? currentClubSeason.clubId} · {currentClubSeason.season}
                </h3>
                <button
                  type="button"
                  onClick={handleReroll}
                  disabled={rerollsLeft <= 0}
                  className="rounded-lg border border-neutral-600 px-3 py-1 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
                >
                  Reroll ({rerollsLeft})
                </button>
              </div>
              <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
                {currentClubSeason.squad
                  .filter((r) => !targetBroadPositions || (slots[selectedSlot!] && isPositionCompatible(r.broadPosition, slots[selectedSlot!].position)))
                  .filter((r) => settings.draftMode !== 'squad-first' || openSlotIndexes.some((i) => isPositionCompatible(r.broadPosition, slots[i].position)))
                  .sort((a, b) => b.seasonRatings.overall - a.seasonRatings.overall)
                  .map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => draftPlayer(record)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:border-emerald-500 ${
                        pendingRecord?.id === record.id
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-neutral-700 bg-neutral-800/60'
                      }`}
                    >
                      <span>
                        <span className="mr-2 rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-semibold">{record.broadPosition}</span>
                        {record.name}
                        <span className="ml-1 text-xs text-neutral-500">({record.nationality})</span>
                      </span>
                      {settings.showRatings && (
                        <span className="font-bold text-emerald-400">
                          {settings.ratingsMode === 'prime' ? record.primeRatings.overall : record.seasonRatings.overall}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {allFilled && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="mt-8 w-full rounded-lg bg-emerald-600 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Confirm squad & start season →'}
        </button>
      )}
    </div>
  );
}
