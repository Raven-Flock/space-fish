// F-02 touch pause (GD SoT F02-TOUCH-PAUSE-v0.1, Nov 18; VP-PHONE-HUD v0.1.1/v0.1.2;
// Sound, Nov 18). Data only.
export const PAUSE = {
  /** gameplay input (fire, use, noise, canvas taps) is ignored this long after a resume, ms */
  resumeIgnoreMs: 150,
  /** master fades to 0 over this long before the AudioContext suspends (no click), ms (Sound) */
  audioFadeOutMs: 40,
  /** after that fade ends, wait this long before suspending the context (QA-PR12 P2), ms */
  suspendMarginMs: 40,
  /** after a pointer tap on a pause control, ignore a mouse click on it for this long, ms */
  tapClickDedupeMs: 600,
  /** music bus fades back in over this long after a resume, ms (Sound) */
  musicFadeInMs: 150,
  /** visible Pause plate inside the 36 px top strip, CSS px (VP v0.1.2) */
  platePx: 36,
  plateRadius: 10,
  /** transparent hit box around the plate; it may hang this far below the strip (VP v0.1.2) */
  hitPx: 44,
  hangPx: 8,
  /** offset from each edge: max(edgePx, env(safe-area-inset-*)) (VP v0.1.1) */
  edgePx: 12,
  /** minimum clear space between Pause and any other control, CSS px */
  clearPx: 8,
  /** the two bars (VP v0.1.1) */
  barW: 4,
  barH: 16,
  /** space between the bars, CSS px (not in VP's spec: open question, centred 4 + 4 + 4) */
  barGap: 4,
  barColor: "#E8EFE9",
  plateColor: "rgba(12,18,24,0.72)",
  /** standard-mapping gamepad button index for Start */
  padStartButton: 9,
};
