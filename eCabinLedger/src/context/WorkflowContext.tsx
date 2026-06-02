import React, { createContext, useContext, useState } from "react";

interface WorkflowContextType {
  isWorkflow: boolean;
  startWorkflow: () => void;
  endWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowContextType>({
  isWorkflow: false,
  startWorkflow: () => {},
  endWorkflow: () => {},
});

export const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const [isWorkflow, setIsWorkflow] = useState(false);
  return (
    <WorkflowContext.Provider
      value={{
        isWorkflow,
        startWorkflow: () => setIsWorkflow(true),
        endWorkflow:   () => setIsWorkflow(false),
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => useContext(WorkflowContext);
