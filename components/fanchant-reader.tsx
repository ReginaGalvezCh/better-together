"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Mic2, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { demoChant, nextCueIndex, type ChantGuide } from "@/lib/fanchants";

function Reader({ guide }: { guide: ChantGuide }) {
  const [current, setCurrent] = useState(0);
  const blocks = useRef<(HTMLButtonElement | null)[]>([]);
  function select(index: number) {
    setCurrent(index);
    // Manual navigation only: no microphone, timers, or continuous animation.
    blocks.current[index]?.scrollIntoView({ block: "center", behavior: "instant" });
  }
  return <>
    <div className="chant-demo-note"><strong>Demostración</strong><p>{guide.source}</p><p>Tú llevas el ritmo: toca un bloque o usa las flechas. No se sincroniza con el show.</p></div>
    <div className="chant-lines" role="group" aria-label="Indicaciones del fanchant">
      {guide.cues.map((cue, index) => <button type="button" key={cue.id} ref={(element) => { blocks.current[index] = element; }} className="chant-cue" aria-current={index === current ? "step" : undefined} onClick={() => select(index)}>
        <span className="chant-when">{cue.when}</span><strong>{cue.shout}</strong><span>{cue.note}</span>
      </button>)}
    </div>
    <div className="chant-controls">
      <p role="status" aria-live="polite">Bloque {current + 1} de {guide.cues.length}</p>
      <div><button type="button" disabled={current === 0} onClick={() => select(nextCueIndex(current, -1, guide.cues.length))}><ArrowLeft size={18} aria-hidden="true" /> Anterior</button><button type="button" disabled={current === guide.cues.length - 1} onClick={() => select(nextCueIndex(current, 1, guide.cues.length))}>Siguiente <ArrowRight size={18} aria-hidden="true" /></button></div>
    </div>
  </>;
}

export function FanchantReader() {
  return <Dialog>
    <DialogTrigger className="chant-launch"><Mic2 aria-hidden="true" /><span><strong>Fanchants</strong><small>Prueba el lector · Qué gritar y cuándo</small></span><ArrowRight aria-hidden="true" /></DialogTrigger>
    <DialogContent className="chant-reader" showCloseButton={false}>
      <DialogHeader className="chant-header"><div><DialogTitle>{demoChant.title}</DialogTitle><DialogDescription>Fanchants · Lectura manual</DialogDescription></div><DialogClose className="chant-close" aria-label="Cerrar lector de fanchants"><X aria-hidden="true" /></DialogClose></DialogHeader>
      <Reader guide={demoChant} />
    </DialogContent>
  </Dialog>;
}
