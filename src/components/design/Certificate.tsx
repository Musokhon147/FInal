import { StarMark } from "./StarMark";

/** A4-landscape certificate, styled as paper; prints on one page. */
export default function Certificate({
  journal, heading, certifies, names, body, details, number, verifyUrl, signer, signerRole, issuedLabel, issued, numberLabel, verifyLabel,
}: {
  journal: string; heading: string; certifies: string; names: string; body: string; details: string[];
  number: string; verifyUrl: string; signer: string; signerRole: string; issuedLabel: string; issued: string; numberLabel: string; verifyLabel: string;
}) {
  return (
    <div className="cert mx-auto aspect-[297/210] w-full max-w-[1000px] overflow-hidden rounded-xl shadow-2xl print:max-w-none print:rounded-none print:shadow-none" style={{ background: "#fffdf7", color: "#1c2238" }}>
      <div className="relative m-[2.2%] flex h-[95.6%] flex-col items-center justify-between border-[3px] border-double px-[6%] py-[4%] text-center" style={{ borderColor: "#c99a2e" }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]" aria-hidden="true"><StarMark size={420} /></div>
        <div className="relative flex flex-col items-center gap-2">
          <StarMark size={44} />
          <p className="text-[clamp(10px,1.4vw,15px)] tracking-wide" style={{ color: "#55607a" }}>{journal}</p>
        </div>
        <div className="relative flex flex-col items-center">
          <h1 className="font-serif text-[clamp(20px,3.6vw,42px)] font-light" style={{ color: "#0a1d5c" }}>{heading}</h1>
          <p className="mt-[2%] text-[clamp(10px,1.3vw,15px)]" style={{ color: "#55607a" }}>{certifies}</p>
          <p className="mt-[1.5%] font-serif text-[clamp(16px,2.6vw,30px)]" style={{ color: "#9a6a00" }}>{names}</p>
          <p className="mx-auto mt-[2%] max-w-[85%] text-[clamp(10px,1.4vw,16px)] leading-relaxed">{body}</p>
          {details.length > 0 && <p className="mt-[1.5%] text-[clamp(9px,1.1vw,13px)]" style={{ color: "#55607a" }}>{details.join(" · ")}</p>}
        </div>
        <div className="relative flex w-full items-end justify-between text-left text-[clamp(8px,1vw,12px)]" style={{ color: "#55607a" }}>
          <div>
            <p>{numberLabel}: <b style={{ color: "#1c2238" }}>{number}</b></p>
            <p>{issuedLabel}: {issued}</p>
            <p className="break-all">{verifyLabel}: {verifyUrl}</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-px w-[min(220px,22vw)]" style={{ background: "#1c2238" }} />
            <p style={{ color: "#1c2238" }}>{signer}</p>
            <p>{signerRole}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
