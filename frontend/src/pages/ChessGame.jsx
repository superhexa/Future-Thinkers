import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr, wsUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flag, ArrowRight, Crown } from "lucide-react";

const PIECES = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚", P: "♙", N: "♘", B: "♗", R: "♖", Q: "♕", K: "♔" };
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function ChessGame() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [game, setGame] = useState(null);
  const [chess, setChess] = useState(null);
  const [sel, setSel] = useState(null);
  const [legal, setLegal] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/chess/${"games"}/${id}`);
      setGame(data);
      const c = new Chess();
      try { c.load(data.fen); } catch {}
      setChess(c);
    } catch (e) { toast.error(apiErr(e)); }
  }, [id]);

  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [load]);

  // real-time via WebSocket (polling above stays as fallback)
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(wsUrl(`/api/ws/chess/${id}`));
      ws.onmessage = () => load();
    } catch {}
    return () => { try { ws && ws.close(); } catch {} };
  }, [id, load]);

  const myColor = game?.my_color;
  const myTurn = game && game.status === "active" && game.turn === myColor;
  const ranks = (() => {
    const r = [8, 7, 6, 5, 4, 3, 2, 1];
    const f = [...FILES];
    if (myColor === "b") { r.reverse(); f.reverse(); }
    return { r, f };
  })();

  const onSquareClick = async (square) => {
    if (!myTurn || !chess) return;
    const piece = chess.get(square);
    if (sel) {
      if (legal.includes(square)) {
        const move = chess.move({ from: sel, to: square, promotion: "q" });
        if (move) {
          const over = chess.isGameOver();
          const nextTurn = chess.turn();
          try {
            await api.post(`/chess/games/${id}/move`, { fen: chess.fen(), san: move.san, pgn: chess.pgn(), turn: nextTurn });
            setGame((g) => ({ ...g, fen: chess.fen(), turn: nextTurn }));
            if (over) {
              let result = "draw";
              if (chess.isCheckmate()) result = move.color === "w" ? "white" : "black";
              await api.post(`/chess/games/${id}/result`, { result });
              toast.success(result === "draw" ? "تعادل!" : "كش مات!");
              load();
            }
          } catch (e) { toast.error(apiErr(e)); load(); }
        }
        setSel(null); setLegal([]);
        return;
      }
    }
    if (piece && piece.color === myColor) {
      setSel(square);
      setLegal(chess.moves({ square, verbose: true }).map((m) => m.to));
    } else { setSel(null); setLegal([]); }
  };

  const resign = async () => {
    try { await api.post(`/chess/games/${id}/resign`); toast.info("انسحبت من المباراة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  if (!game || !chess) return <Layout><PageLoader /></Layout>;

  const inCheck = chess.inCheck?.() || chess.isCheck?.();
  const opponent = myColor === "w" ? game.black_name : game.white_name;
  const meName = myColor === "w" ? game.white_name : game.black_name;

  return (
    <Layout noFooter>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <button onClick={() => nav("/clubs/chess")} className="text-slate-500 hover:text-slate-800 text-sm mb-4 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> عودة للحلبة</button>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div>
            <PlayerBar name={opponent} rating={myColor === "w" ? game.black_rating : game.white_rating} active={game.turn !== myColor && game.status === "active"} />
            <div className="my-2 aspect-square w-full max-w-[560px] mx-auto grid grid-cols-8 rounded-2xl overflow-hidden ft-shadow-lg border-4 border-slate-800">
              {ranks.r.map((rank) => ranks.f.map((file) => {
                const square = `${file}${rank}`;
                const piece = chess.get(square);
                const dark = (FILES.indexOf(file) + rank) % 2 === 0;
                const isSel = sel === square;
                const isLegal = legal.includes(square);
                return (
                  <button key={square} data-testid={`sq-${square}`} onClick={() => onSquareClick(square)}
                    className={`relative grid place-items-center text-3xl sm:text-4xl transition-colors ${dark ? "bg-[#b58863]" : "bg-[#f0d9b5]"} ${isSel ? "!bg-blue-400" : ""}`}>
                    {piece && <span className={piece.color === "w" ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" : "text-slate-900"}>{PIECES[piece.color === "w" ? piece.type.toUpperCase() : piece.type]}</span>}
                    {isLegal && <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-600/60" />}
                  </button>
                );
              }))}
            </div>
            <PlayerBar name={meName + " (أنت)"} rating={user.chess_rating} active={myTurn} />
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
              <h3 className="font-head font-bold flex items-center gap-2 mb-2"><Crown className="w-5 h-5 text-amber-500" /> حالة المباراة</h3>
              {game.status === "finished" ? (
                <div className="text-center py-3">
                  <div className="text-lg font-bold text-slate-800">{game.result === "draw" ? "تعادل" : (game.winner_id === user.id ? "فزت! 🏆" : "انتهت المباراة")}</div>
                  <div className="text-sm text-slate-500 mt-1">الفائز: {game.result === "white" ? game.white_name : game.result === "black" ? game.black_name : "لا أحد"}</div>
                </div>
              ) : (
                <>
                  <div className={`text-sm px-3 py-2 rounded-lg ${myTurn ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}`}>{myTurn ? "دورك الآن — حرّك قطعة" : `بانتظار ${opponent}…`}</div>
                  {inCheck && <div className="text-sm text-rose-600 mt-2 font-medium">كش! الملك تحت التهديد</div>}
                  <Button data-testid="resign-btn" onClick={resign} variant="outline" className="w-full mt-3 rounded-xl text-rose-600 border-rose-200"><Flag className="w-4 h-4 ml-1" /> انسحاب</Button>
                </>
              )}
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
              <h4 className="font-semibold text-sm mb-2">النقلات</h4>
              <div className="text-sm text-slate-500 font-mono max-h-48 overflow-y-auto leading-6" dir="ltr">
                {game.moves?.length ? game.moves.map((m, i) => <span key={i} className="ml-1">{i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ""}{m.san} </span>) : "لا نقلات بعد"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function PlayerBar({ name, rating, active }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl max-w-[560px] mx-auto ${active ? "bg-emerald-600 text-white" : "bg-white border border-slate-100"}`}>
      <span className="font-medium">{name}</span>
      <span className={`text-sm ${active ? "text-white/80" : "text-slate-400"}`}>{rating} ELO</span>
    </div>
  );
}
