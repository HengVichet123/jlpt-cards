// Entry point. Step 1 of the migration: the app code and styles moved out of index.html unchanged.
// Next steps split src/legacy/app.js into typed modules (see MIGRATION_PLAN.md).
import "./styles/tailwind.css";
import "./styles/app.css";
import "./legacy/app.js";
