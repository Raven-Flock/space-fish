import { BUILD_COST, BUILD_LABEL } from "../content/tuning/build";
export function musicKnob(value, onChange) {
  return (
    <label className="flex items-center gap-3 text-xs text-muted">
      Music
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        aria-label="Music volume"
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "9rem",
          accentColor: "#d4a24a",
        }}
      />
    </label>
  );
}
export function Panel({ children: e }: { children?: any }) {
  return (
    <div className="pointer-events-none flex flex-1 items-end p-3 sm:items-center sm:justify-center sm:p-6">
      <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-3 rounded-xl border border-border bg-surface/95 p-5 backdrop-blur-sm">
        {e}
      </div>
    </div>
  );
}
export function BuildButton({
  kind: e,
  snap: t,
  onPick: n,
}: {
  kind: string;
  snap: any;
  onPick: (kind: string) => void;
}) {
  let r = t.build === e;
  return (
    <button
      type="button"
      title={r ? "Selected for repair" : "Select, then tap the matching wreck"}
      className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-bold ${r ? "border-primary bg-primary text-on-primary" : "border-border bg-bg"}`}
      onClick={() => n(e)}
    >
      {BUILD_LABEL[e]} {BUILD_COST[e]}
    </button>
  );
}
export function PadButton({
  children: e,
  onPress: t,
  hold: n,
  onHold: r,
  size: z,
  hud: h,
  className: c,
  label: l,
  onUse: u,
}: {
  children?: any;
  onPress?: () => void;
  hold?: boolean;
  onHold?: (down: boolean) => void;
  /** F-04: fixed square size (44 targets, 56 Use, 72/64 Fire; a CSS length is allowed); omit for the old 64 px min-height */
  size?: number | string;
  /** F-04: data-hud name, so QA's footprint sum finds the control */
  hud?: string;
  /** F-04: extra class (right-stack position) */
  className?: string;
  /** F-04 (VP v0.1.2 §5): a 12 px label under the button; "" hides it */
  label?: string;
  /** F-04: counts a use (press) of the button, for the label rule */
  onUse?: () => void;
}) {
  let btn = (
    <button
      type="button"
      className="font-display font-bold"
      data-hud={h}
      style={{
        ...(z
          ? { width: z, height: z, padding: 0, fontSize: typeof z === "number" && z < 56 ? 12 : 16 }
          : { minHeight: 64, fontSize: 16 }),
        borderRadius: 14,
        border: "1px solid rgba(232,239,233,0.28)",
        background: "rgba(18,26,34,0.92)",
        color: "#e8efe9",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        u?.();
        if (n) {
          r?.(true);
        }
      }}
      onPointerUp={() => {
        if (n) {
          r?.(false);
        } else {
          t?.();
        }
      }}
      onPointerCancel={() => {
        if (n) {
          r?.(false);
        }
      }}
    >
      {e}
    </button>
  );
  if (!c) {
    return btn;
  }
  // F-04 right stack: the wrapper is positioned; the label sits under the button
  return (
    <span className={`sf-btn ${c}`}>
      {btn}
      {l ? (
        <span className="sf-btn-label" aria-hidden="true">
          {l}
        </span>
      ) : null}
    </span>
  );
}
