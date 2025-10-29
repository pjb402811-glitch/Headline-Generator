import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // By removing React.StrictMode, we prevent components from rendering twice in development.
  // This can resolve rare race conditions, such as the "invalid document state" error that
  // sometimes occurs during service worker registration in specific environments.
  <App />
);

// Service worker registration logic has been moved to App.tsx to align with the component lifecycle.
