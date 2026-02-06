import { useState } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CockpitLayout } from "./components/CockpitLayout";
import { BootSequence } from "./components/BootSequence";
import Home from "./pages/Home";
import Gateway from "./pages/Gateway";
import Logs from "./pages/Logs";
import Skills from "./pages/Skills";
import Flows from "./pages/Flows";
import Connectors from "./pages/Connectors";
import Automation from "./pages/Automation";
import Costs from "./pages/Costs";
import Executions from "./pages/Executions";
import Health from "./pages/Health";

function Router() {
  return (
    <CockpitLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/gateway" component={Gateway} />
        <Route path="/logs" component={Logs} />
        <Route path="/skills" component={Skills} />
        <Route path="/flows" component={Flows} />
        <Route path="/connectors" component={Connectors} />
        <Route path="/automation" component={Automation} />
        <Route path="/costs" component={Costs} />
        <Route path="/executions" component={Executions} />
        <Route path="/health" component={Health} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </CockpitLayout>
  );
}

function App() {
  const [booting, setBooting] = useState(() => {
    return !sessionStorage.getItem('bootSequenceShown');
  });

  const handleBootComplete = () => {
    sessionStorage.setItem('bootSequenceShown', 'true');
    setBooting(false);
  };

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {booting ? (
            <BootSequence onComplete={handleBootComplete} />
          ) : (
            <Router />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
