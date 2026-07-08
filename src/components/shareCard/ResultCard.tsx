import { useEffect, useRef } from 'react';

interface Props {
  teamName: string;
  primaryColor: string;
  position: number;
  totalTeams: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  isPerfectSeason: boolean;
}

const CARD_WIDTH = 600;
const CARD_HEIGHT = 750;

export function ResultCard(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
    gradient.addColorStop(0, '#0b0f19');
    gradient.addColorStop(1, props.primaryColor + '33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('PITCHSIDE · SEASON RESULT', CARD_WIDTH / 2, 60);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText(props.teamName, CARD_WIDTH / 2, 120);

    ctx.font = 'bold 120px system-ui, sans-serif';
    ctx.fillStyle = props.primaryColor;
    ctx.fillText(`#${props.position}`, CARD_WIDTH / 2, 280);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`of ${props.totalTeams} teams`, CARD_WIDTH / 2, 320);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText(`${props.won}W ${props.drawn}D ${props.lost}L`, CARD_WIDTH / 2, 400);

    ctx.font = '24px system-ui, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`${props.played} played · ${props.points} points`, CARD_WIDTH / 2, 440);

    if (props.isPerfectSeason) {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillText('★ PERFECT SEASON ★', CARD_WIDTH / 2, 520);
    }

    ctx.fillStyle = '#4b5563';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('Not affiliated with any league, club, or federation.', CARD_WIDTH / 2, CARD_HEIGHT - 30);
  }, [props]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${props.teamName.replace(/\s+/g, '-').toLowerCase()}-result.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={CARD_WIDTH} height={CARD_HEIGHT} className="w-full max-w-sm rounded-xl border border-neutral-700" />
      <button
        type="button"
        onClick={handleDownload}
        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
      >
        Download result card
      </button>
    </div>
  );
}
