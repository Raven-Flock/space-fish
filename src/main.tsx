import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { Root } from "./app/SpaceFishApp";
import "./app/styles.css";

// index.html ships the same pre-rendered title card as live 69cf5be,
// so the first paint is never a black screen; React hydrates it.
startTransition(() => {
  hydrateRoot(
    document.getElementById("root") as HTMLElement,
    <StrictMode>
      <Root />
    </StrictMode>,
  );
});
