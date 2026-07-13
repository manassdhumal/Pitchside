import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { DraftSettings, Player, Position, RealPlayerRecord, Team, ClubSeason } from '../types';
import { REROLLS_BY_DIFFICULTY, POSITION_TO_BROAD } from '../types';
import { FORMATION_SLOTS } from '../data/formations';
import { getClub, getLeague } from '../data/leagues';
import {
  loadIndex, filterEntries, loadClubSeason,
  isPositionCompatible, inferSpecificPosition, realPlayerToEnginePlayer, type ClubSeasonIndexEntry,
} from '../data/historicalData';
import { computeTeamOvr } from '../engine/teamRatings';
import { putPlayers, putTeam } from '../storage/cache';
import { useAppDispatch } from '../state/AppContext';
import { ProgrammeNav, ProgrammeFooter } from '../components/chrome/ProgrammeChrome';
import { RaffleDrum, LEAGUE_INKS, POSITION_INKS, LINE_PALETTE } from '../components/chrome/RaffleDrum';

const KITS: { name: string; c1: string; c2: string }[] = [
  { name: 'Claret & Blue', c1: '#7A2E3B', c2: '#2F5D8A' },
  { name: 'Navy & Gold', c1: '#1D2B45', c2: '#C7A63E' },
  { name: 'Brick & Cream', c1: '#A83E2C', c2: '#F6EFDF' },
  { name: 'Green & White', c1: '#3E7A4E', c2: '#FDFAF1' },
  { name: 'Amber & Black', c1: '#B4691E', c2: '#26221A' },
  { name: 'Violet & Sky', c1: '#4A3070', c2: '#9BB8D3' },
];

const SPIN_MS = 1500;

/** One tile in the live team-OVR strip (OVR / DEF / MID / ATK). */
function OvrTile({ label, value, ink, big = false }: { label: string; value: number; ink: string; big?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-1.5"
      style={{ border: `1.5px solid ${ink}`, borderRadius: 4, background: 'var(--card)' }}
    >
      <span className="font-stamp leading-none" style={{ fontSize: big ? 27 : 21, color: ink }}>
        {value > 0 ? value : '—'}
      </span>
      <span className="mt-0.5 text-[9px] font-bold tracking-[0.14em]" style={{ color: 'var(--soft)' }}>
        {label}
      </span>
    </div>
  );
}

interface FilledSlot {
  player: Player;
  record: RealPlayerRecord;
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
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'revealed'>('ready');
  const [drumRot, setDrumRot] = useState(0);
  const [currentClubSeason, setCurrentClubSeason] = useState<ClubSeason | null>(null);
  const [pendingRecord, setPendingRecord] = useState<RealPlayerRecord | null>(null);
  const [rerollsLeft, setRerollsLeft] = useState(0);
  const [teamName, setTeamName] = useState('Corinthian Wanderers');
  const [kitIdx, setKitIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClubIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!settings) { navigate('/setup'); return; }
    loadIndex().then(setEntries);
    setFilled(new Array(FORMATION_SLOTS[settings.formation].length).fill(null));
    setRerollsLeft(REROLLS_BY_DIFFICULTY[settings.difficulty]);
  }, [settings, navigate]);

  useEffect(() => () => { if (spinTimer.current) clearTimeout(spinTimer.current); }, []);

  const slots = useMemo(() => (settings ? FORMATION_SLOTS[settings.formation] : []), [settings]);
  const openSlotIndexes = useMemo(() => filled.map((f, i) => (f ? -1 : i)).filter((i) => i !== -1), [filled]);
  const filledCount = filled.filter(Boolean).length;
  const allFilled = openSlotIndexes.length === 0 && filled.length > 0;

  const teamOvr = useMemo(
    () => computeTeamOvr(filled.filter((f): f is FilledSlot => f !== null).map((f) => f.player)),
    [filled],
  );

  const eligibleEntries = useMemo(() => {
    if (!settings || !entries) return [];
    return filterEntries(entries, { leagueIds: settings.leagueIds, seasonMin: settings.seasonMin, seasonMax: settings.seasonMax });
  }, [settings, entries]);

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

  const canSpin = settings?.draftMode === 'squad-first' ? openSlotIndexes.length > 0 : selectedSlot !== null;

  const handleSpin = () => {
    if (!settings || eligibleEntries.length === 0 || !canSpin || phase === 'spinning') return;
    const entry = pickSpinTarget();
    if (!entry) return;
    lastClubIdRef.current = entry.clubId;

    setPhase('spinning');
    setCurrentClubSeason(null);
    setPendingRecord(null);
    setDrumRot((r) => r + 6 * 360 + 40 + Math.random() * 280);

    const loading = loadClubSeason(entry.leagueId, entry.clubId, entry.season);
    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(async () => {
      const clubSeason = await loading;
      setCurrentClubSeason(clubSeason);
      setPhase('revealed');
    }, SPIN_MS);
  };

  const handleReroll = () => {
    if (rerollsLeft <= 0 || phase === 'spinning') return;
    setRerollsLeft((r) => r - 1);
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
      next[targetIndex] = { player, record, clubName: club?.name ?? currentClubSeason.clubId, season: currentClubSeason.season };
      return next;
    });
    setCurrentClubSeason(null);
    setPendingRecord(null);
    setSelectedSlot(null);
    setPhase('ready');
  };

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
    setPendingRecord((prev) => (prev?.id === record.id ? null : record));
  };

  const removeSlot = (index: number) => {
    setFilled((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleSlotClick = (i: number) => {
    if (pendingRecord && !filled[i] && isPositionCompatible(pendingRecord.broadPosition, slots[i].position)) {
      placeIntoSlot(pendingRecord, i);
      return;
    }
    if (filled[i]) { removeSlot(i); return; }
    if (settings?.draftMode === 'position-first') setSelectedSlot(i);
  };

  const handleConfirm = async () => {
    if (!settings || !allFilled) return;
    setSaving(true);
    const teamId = `team-user-${Date.now()}`;
    const kit = KITS[kitIdx];
    const players = filled.map((f) => f!.player);

    const team: Team = {
      id: teamId,
      name: teamName.trim() || 'Corinthian Wanderers',
      shortName: (teamName.trim() || 'CW').slice(0, 3).toUpperCase(),
      country: 'INT',
      crest: { shape: 'shield', primaryColor: kit.c1, secondaryColor: kit.c2, icon: 'shield' },
      colors: { primary: kit.c1, secondary: kit.c2 },
      squad: players.map((p) => p.id),
      formation: settings.formation,
      isUserCreated: true,
      isProcedural: false,
    };

    await putPlayers(players);
    await putTeam(team);
    dispatch({ type: 'SET_CURRENT_TEAM', teamId });
    navigate('/season', {
      state: {
        leagueIds: settings.leagueIds, seasonMax: settings.seasonMax, ratingsMode: settings.ratingsMode,
        managersEnabled: settings.managersEnabled, transferWindowEnabled: settings.transferWindowEnabled,
      },
    });
  };

  if (!settings) return null;

  const kit = KITS[kitIdx];
  const showRatings = settings.showRatings;
  const club = currentClubSeason ? getClub(currentClubSeason.clubId) : null;
  const league = currentClubSeason ? getLeague(currentClubSeason.leagueId) : null;
  const clubInk = currentClubSeason ? (LEAGUE_INKS[currentClubSeason.leagueId] ?? '#1D2B45') : '#1D2B45';

  const ratingOf = (r: RealPlayerRecord) =>
    settings.ratingsMode === 'prime' ? r.primeRatings.overall : r.seasonRatings.overall;

  // Can this player go into any currently-open slot? Drives both the placeable-first ordering
  // and the per-row enabled/disabled styling below.
  const isPlaceable = (r: RealPlayerRecord) =>
    settings.draftMode === 'position-first' && selectedSlot !== null
      ? isPositionCompatible(r.broadPosition, slots[selectedSlot].position)
      : openSlotIndexes.some((i) => isPositionCompatible(r.broadPosition, slots[i].position));

  const squadRows = currentClubSeason
    ? currentClubSeason.squad
        .filter((r) => {
          if (settings.draftMode === 'position-first' && selectedSlot !== null) {
            return isPositionCompatible(r.broadPosition, slots[selectedSlot].position);
          }
          return true;
        })
        .slice()
        // Compatible (placeable) players first, then by rating within each group, so the drafts
        // you can actually make surface at the top instead of the highest-rated unplaceable ones.
        .sort((a, b) => {
          const pa = isPlaceable(a) ? 1 : 0;
          const pb = isPlaceable(b) ? 1 : 0;
          if (pa !== pb) return pb - pa;
          return ratingOf(b) - ratingOf(a);
        })
    : [];

  const hintText = pendingRecord
    ? `Now tap a striped slot on the pitch to stick ${pendingRecord.name.split(' ').pop()} in.`
    : phase === 'revealed'
      ? settings.draftMode === 'position-first'
        ? 'Pick a player — he goes straight into your chosen slot.'
        : `Pick a player from the ${club?.name ?? ''} squad — open slots for their position will light up.`
      : settings.draftMode === 'position-first' && selectedSlot === null
        ? 'Tap an empty slot on the pitch first, then spin the drum for it.'
        : null;

  return (
    <div className="flex min-h-svh flex-col">
      <ProgrammeNav
        left={
          <Link to="/setup" className="no-underline hover:text-[var(--brick)]" style={{ color: 'var(--soft)' }}>
            ← Setup
          </Link>
        }
        right={
          <span className="flex items-center gap-4">
            <span className="font-stamp text-xs tracking-[0.06em]" style={{ color: 'var(--brick)' }}>
              STICKER {Math.min(filledCount + 1, 11)} OF 11
            </span>
            <span className="inline-flex gap-[3px]">
              {filled.map((f, i) => (
                <span
                  key={i}
                  className="h-[11px] w-[9px] border"
                  style={{
                    borderColor: 'var(--pip-border)',
                    background: f ? 'var(--pip-filled)' : 'var(--pip-empty)',
                  }}
                />
              ))}
            </span>
          </span>
        }
      />

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 lg:grid-cols-[1.25fr_1fr]">
        {/* ============ LEFT: ALBUM PAGE ============ */}
        <section
          className="px-5 pb-10 pt-7 sm:px-8 lg:border-r-[3px]"
          style={{ borderColor: 'var(--line)', borderRightStyle: 'double' }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--soft)' }}>
                Your club
              </label>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={26}
                className="font-display w-[290px] border-0 border-b-2 bg-transparent px-0 py-0.5 text-[26px] font-extrabold outline-none sm:w-[320px] sm:text-[30px]"
                style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--soft)' }}>
                Kit colours
              </span>
              <div className="flex gap-2">
                {KITS.map((k, i) => (
                  <button
                    key={k.name}
                    type="button"
                    title={k.name}
                    onClick={() => setKitIdx(i)}
                    className="h-6 w-[34px] cursor-pointer p-0"
                    style={{
                      background: `linear-gradient(135deg,${k.c1} 50%,${k.c2} 50%)`,
                      border: `2px solid ${i === kitIdx ? 'var(--ink)' : 'var(--line)'}`,
                      outline: i === kitIdx ? '2px solid var(--brick)' : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* live team OVR — updates as the XI fills, and feeds the season simulator */}
          <div className="mx-auto mb-4 grid max-w-[560px] grid-cols-4 gap-2">
            <OvrTile label="TEAM OVR" value={teamOvr.overall} ink="var(--ink)" big />
            <OvrTile label="DEF" value={teamOvr.def} ink={LINE_PALETTE.DF.ink} />
            <OvrTile label="MID" value={teamOvr.mid} ink={LINE_PALETTE.MF.ink} />
            <OvrTile label="ATK" value={teamOvr.atk} ink={LINE_PALETTE.FW.ink} />
          </div>

          {/* pitch */}
          <div
            className="relative mx-auto w-full max-w-[560px]"
            style={{
              aspectRatio: '4/5',
              background: 'repeating-linear-gradient(0deg,var(--grass-a) 0 12.5%,var(--grass-b) 12.5% 25%)',
              border: '8px solid var(--card)',
              outline: '1px solid var(--border)',
              boxShadow: '6px 6px 0 var(--card-shadow)',
              boxSizing: 'border-box',
              transition: 'background .4s,border-color .4s',
            }}
          >
            <div className="absolute" style={{ inset: 14, border: '2px solid rgba(253,250,241,.72)' }} />
            <div className="absolute left-3.5 right-3.5 top-1/2" style={{ borderTop: '2px solid rgba(253,250,241,.72)' }} />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ width: '22%', aspectRatio: '1', border: '2px solid rgba(253,250,241,.72)' }}
            />
            <div
              className="absolute bottom-3.5 left-1/2 -translate-x-1/2"
              style={{ width: '42%', height: '12%', border: '2px solid rgba(253,250,241,.72)', borderBottom: 'none' }}
            />
            <div
              className="absolute left-1/2 top-3.5 -translate-x-1/2"
              style={{ width: '42%', height: '12%', border: '2px solid rgba(253,250,241,.72)', borderTop: 'none' }}
            />
            <div className="absolute bottom-4 left-[18px] text-[9px] tracking-[0.2em]" style={{ color: 'rgba(253,250,241,.6)' }}>
              ALBUM PAGE 07 · THE FIRST XI
            </div>

            {slots.map((slot, i) => {
              const f = filled[i];
              const compatible = !f && pendingRecord
                ? isPositionCompatible(pendingRecord.broadPosition, slot.position)
                : false;
              const isSelected = settings.draftMode === 'position-first' && selectedSlot === i && !f;
              const highlight = compatible || isSelected;

              if (f) {
                const rating = f.player.ratings.overall;
                const foil = showRatings && rating >= 90;
                const broad = POSITION_TO_BROAD[slot.position];
                const pal = LINE_PALETTE[broad];
                const headerBg = foil ? '#8C6A1D' : pal.ink;
                const name = f.player.lastName || f.player.firstName;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSlotClick(i)}
                    title="Tap to remove"
                    className="absolute w-[94px] cursor-pointer overflow-hidden border-0 p-0 sm:w-[100px]"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      transform: 'translate(-50%,-50%)',
                      border: `2px solid ${headerBg}`,
                      borderRadius: 4,
                      background: foil
                        ? 'linear-gradient(120deg,#C7A63E,#F0DE9A 35%,#B08A2E 60%,#E8CE7E)'
                        : pal.tint,
                      boxShadow: '2px 2px 0 rgba(29,43,69,.28)',
                      animation: 'stampIn .4s cubic-bezier(.2,1.2,.4,1)',
                    }}
                  >
                    {/* colour-coded header: position + rating */}
                    <div
                      className="flex items-center justify-between px-1.5 py-0.5"
                      style={{ background: headerBg, color: '#FDFAF1' }}
                    >
                      <span className="font-stamp text-[9px] tracking-[0.04em]">{slot.position}</span>
                      <span className="font-stamp text-[12.5px] leading-none" style={{ color: foil ? '#FFF4CE' : '#FDFAF1' }}>
                        {showRatings ? rating : '—'}
                      </span>
                    </div>
                    {/* name + kit */}
                    <div className="flex flex-col items-center gap-0.5 px-1 pb-1 pt-1">
                      <span
                        className="font-jersey block w-full truncate text-center text-[13px] font-semibold uppercase leading-tight"
                        style={{ color: '#1D2B45' }}
                        title={name}
                      >
                        {name}
                      </span>
                      <span
                        className="h-[9px] w-[16px]"
                        style={{ background: `linear-gradient(135deg,${kit.c1} 50%,${kit.c2} 50%)`, border: '1px solid #1D2B45' }}
                      />
                    </div>
                  </button>
                );
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSlotClick(i)}
                  className="absolute flex h-[96px] w-[80px] flex-col items-center justify-center gap-1.5 p-0 sm:h-[104px] sm:w-[88px]"
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    transform: 'translate(-50%,-50%)',
                    cursor: highlight || settings.draftMode === 'position-first' ? 'pointer' : 'default',
                    border: highlight ? '2.5px solid #FFD98A' : '2px dashed rgba(253,250,241,.85)',
                    background: highlight
                      ? 'repeating-linear-gradient(45deg,rgba(168,62,44,.55) 0 7px,rgba(168,62,44,.3) 7px 14px)'
                      : 'rgba(29,43,69,.15)',
                    animation: highlight ? 'compatPulse 1.6s ease-in-out infinite' : 'none',
                  }}
                >
                  <span
                    className="font-stamp px-1.5 py-0.5 text-[13px] leading-none"
                    style={{ background: LINE_PALETTE[POSITION_TO_BROAD[slot.position]].ink, color: '#FDFAF1', borderRadius: 3 }}
                  >
                    {slot.position}
                  </span>
                  <span
                    className="px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.1em]"
                    style={{
                      background: highlight ? '#FFD98A' : 'transparent',
                      color: highlight ? '#4A2410' : 'rgba(253,250,241,.85)',
                    }}
                  >
                    {compatible ? '▸ PLACE' : isSelected ? '▸ CHOSEN' : slot.position === 'GK' ? 'KEEPER' : 'EMPTY'}
                  </span>
                </button>
              );
            })}
          </div>

          {hintText && !allFilled && (
            <div
              className="mx-auto mt-4 flex max-w-[560px] items-center gap-2.5 border-[1.5px] px-4 py-3 text-[13px]"
              style={{ borderColor: 'var(--hint-border)', background: 'var(--hint-bg)', color: 'var(--hint-fg)' }}
            >
              <span className="font-stamp text-xs">▸</span>
              {hintText}
            </div>
          )}

          {allFilled && (
            <div className="mx-auto mt-5 max-w-[560px] text-center">
              <div className="font-display mb-3.5 text-[19px] italic" style={{ color: 'var(--text)' }}>
                The page is complete. Eleven stickers, one season ahead.
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving}
                className="font-stamp foil-bg relative inline-block cursor-pointer overflow-hidden px-7 py-4 text-[17px] tracking-[0.1em] hover:brightness-105 disabled:opacity-60"
                style={{ color: '#3B2C08', border: '1.5px solid #8C6A1D' }}
              >
                <span
                  className="sheen-layer pointer-events-none absolute inset-0"
                  style={{
                    background: 'linear-gradient(105deg,transparent 38%,rgba(255,255,255,.75) 50%,transparent 62%)',
                    backgroundSize: '220% 100%',
                    animation: 'foilSheen 3.2s ease-in-out infinite',
                  }}
                />
                {saving ? 'SAVING…' : 'KICK OFF THE SEASON →'}
              </button>
            </div>
          )}
        </section>

        {/* ============ RIGHT: THE DRAW ============ */}
        <section
          className="flex flex-col gap-4 px-5 pb-10 pt-7 sm:px-8"
          style={{ background: 'var(--panel)', transition: 'background .4s' }}
        >
          <div className="flex items-baseline justify-between">
            <h2 className="font-display m-0 text-[26px] font-extrabold" style={{ color: 'var(--ink)' }}>The draw</h2>
            <span className="text-xs" style={{ color: 'var(--soft)' }}>
              Re-rolls left: <b className="font-stamp" style={{ color: 'var(--brick)' }}>{rerollsLeft}</b>
            </span>
          </div>

          <div className="flex flex-col items-center gap-4">
            <RaffleDrum
              size={230}
              rotation={drumRot}
              spinning={phase === 'spinning'}
              spinMs={SPIN_MS}
              label={phase === 'spinning' ? '…' : 'SPIN'}
              subLabel={`${eligibleEntries.length.toLocaleString()} TICKETS IN`}
            />
            {phase === 'ready' && !allFilled && (
              <button
                type="button"
                onClick={handleSpin}
                disabled={!canSpin || eligibleEntries.length === 0}
                className="flex cursor-pointer items-center gap-3.5 border-0 px-4 py-3.5 pl-6 text-[15px] font-bold uppercase tracking-[0.06em] transition-transform hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: 'var(--btn-bg)', color: 'var(--btn-fg)', boxShadow: '4px 4px 0 var(--btn-shadow)' }}
              >
                {filledCount === 0 ? 'Spin the drum' : 'Spin again'}
                <span className="font-stamp border-l-[1.5px] border-dashed pl-3.5 text-[13px]" style={{ borderColor: 'var(--btn-divider)' }}>
                  ↻
                </span>
              </button>
            )}
            {phase === 'spinning' && (
              <div
                className="font-display text-[17px] italic"
                style={{ color: 'var(--soft)', animation: 'wobble 1s ease-in-out infinite' }}
              >
                Drawing a ticket…
              </div>
            )}
            {phase === 'ready' && eligibleEntries.length === 0 && entries !== null && (
              <p className="text-center text-[13px]" style={{ color: 'var(--soft)' }}>
                No club-seasons match your setup — loosen the era range or add leagues.
              </p>
            )}
          </div>

          {phase === 'revealed' && currentClubSeason && (
            <div style={{ animation: 'ticketOut .5s cubic-bezier(.2,1.1,.4,1)' }}>
              <div style={{ background: '#FDFAF1', border: '1px solid var(--border)', boxShadow: '4px 4px 0 var(--card-shadow)' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: clubInk, color: '#FDFAF1' }}>
                  <div>
                    <div className="text-[9.5px] tracking-[0.18em]">{(league?.name ?? '').toUpperCase()}</div>
                    <div className="font-display text-[22px] font-extrabold leading-[1.1] sm:text-2xl">
                      {club?.name ?? currentClubSeason.clubId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-stamp text-[19px]">{currentClubSeason.season.replace('-', '–')}</div>
                    <div className="text-[9.5px] tracking-[0.14em] opacity-85">TICKET DRAWN</div>
                  </div>
                </div>
                <div className="max-h-[330px] overflow-y-auto">
                  {squadRows.map((record) => {
                    const placeable = isPlaceable(record);
                    const sel = pendingRecord?.id === record.id;
                    const rating = ratingOf(record);
                    return (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => placeable && draftPlayer(record)}
                        className="grid w-full items-center gap-3 border-0 border-b px-3.5 py-2.5 text-left hover:bg-[#F5E9C8]"
                        style={{
                          gridTemplateColumns: '38px 1fr auto auto',
                          borderBottomColor: '#EDE3CB',
                          background: sel ? '#F5E9C8' : 'transparent',
                          cursor: placeable ? 'pointer' : 'not-allowed',
                          opacity: placeable ? 1 : 0.42,
                        }}
                      >
                        <span
                          className="font-stamp py-0.5 text-center text-[10px]"
                          style={{ background: POSITION_INKS[record.broadPosition], color: '#F6EFDF' }}
                        >
                          {inferSpecificPosition(record.broadPosition, record.shirtNumber)}
                        </span>
                        <span className="min-w-0">
                          <span className="font-jersey block truncate text-[15px] font-semibold uppercase" style={{ color: '#1D2B45', letterSpacing: '0.01em' }}>{record.name}</span>
                          <span className="mt-px block text-[11px]" style={{ color: '#6B5F4A' }}>
                            {record.nationality}{record.shirtNumber ? ` · № ${record.shirtNumber}` : ''}
                          </span>
                        </span>
                        <span className="text-right text-[11px]" style={{ color: '#6B5F4A' }}>
                          {record.stats.appearances} apps · {record.stats.goals} gls
                        </span>
                        <span
                          className="font-stamp min-w-[34px] text-right text-lg"
                          style={{ color: showRatings && rating >= 90 ? '#8C6A1D' : '#A83E2C' }}
                        >
                          {showRatings ? rating : '??'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {rerollsLeft > 0 && (
                <button
                  type="button"
                  onClick={handleReroll}
                  className="mt-3 cursor-pointer border-0 px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em]"
                  style={{ background: '#A83E2C', color: '#FDFAF1', boxShadow: '3px 3px 0 var(--card-shadow)' }}
                >
                  Re-roll this club · {rerollsLeft} left
                </button>
              )}
            </div>
          )}
        </section>
      </main>
      <ProgrammeFooter />
    </div>
  );
}
