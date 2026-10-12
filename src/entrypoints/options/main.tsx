import { createRoot } from "react-dom/client";
import { OptionsApp } from "../../ui/options";
import { t } from "../../lib/i18n";
import "../../ui/app.css";

// The page opens in a tab of its own, so the tab says what it is in the browser's language.
document.title = t("appName") + " · " + t("settings");
const root = document.querySelector("#root");
if (root) createRoot(root).render(<OptionsApp />);
