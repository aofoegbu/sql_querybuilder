import { Play, Save, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FloatingActionsProps {
  onRunQuery: () => void;
  onSaveQuery: () => void;
  onCreateDashboard: () => void;
  isQueryRunning?: boolean;
}

export function FloatingActions({
  onRunQuery,
  onSaveQuery,
  onCreateDashboard,
  isQueryRunning = false,
}: FloatingActionsProps) {
  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              onClick={onRunQuery}
              disabled={isQueryRunning}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Play className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Run Query (Ctrl+Enter)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              onClick={onSaveQuery}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Save className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Save Query (Ctrl+S)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              onClick={onCreateDashboard}
              className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <BarChart3 className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Create Dashboard</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
