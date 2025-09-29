"use client";

import { useStateMachineInput } from "@rive-app/react-canvas";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface RiveButtonProps {
  rive: any;
  className?: string;
}

export default function RiveButton({ rive, className }: RiveButtonProps) {
  const hoverInput = useStateMachineInput(rive, "State Machine 1", "isHover", false);
  
  return (
    <div className={className}>
      <Link href="/learn">
        <Button 
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-105"
          onMouseEnter={() => hoverInput && (hoverInput.value = true)}
          onMouseLeave={() => hoverInput && (hoverInput.value = false)}
        >
          🚀 Start Now
        </Button>
      </Link>
    </div>
  );
}
