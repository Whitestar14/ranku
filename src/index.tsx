import ReactDOM from "react-dom/client";
import { App } from "@/App";
import { ToastProvider } from "@/context/ToastContext";
import { GlobalDragDropProvider } from "@/components/dnd/GlobalDragDropProvider";
import { MotionProvider } from "@/components/MotionProvider";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <MotionProvider>
    <ToastProvider>
      <GlobalDragDropProvider>
        <App />
      </GlobalDragDropProvider>
    </ToastProvider>
  </MotionProvider>,
);
