// hooks/use-vapi.ts
"use client"; // Ensure this is a client component if not already

import { useEffect, useRef, useState, useCallback } from "react";
import Vapi from "@vapi-ai/web";

// These will be populated by Next.js from the environment variables
// set up in next.config.js and ultimately from Cloud Run secrets
const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";
const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "";

const useVapi = () => {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [conversation, setConversation] = useState<
    { role: string; text: string; timestamp: string; isFinal: boolean }[]
  >([]);
  const vapiRef = useRef<any>(null); // Consider typing Vapi instance if possible

  const initializeVapi = useCallback(() => {
    // console.log("useVapi: Initializing with publicKey:", publicKey); // For debugging
    // console.log("useVapi: Assistant ID to be used:", assistantId); // For debugging
    if (!vapiRef.current && publicKey) { // Only initialize if publicKey is present
      const vapiInstance = new Vapi(publicKey);
      vapiRef.current = vapiInstance;

      vapiInstance.on("call-start", () => {
        // console.log("useVapi: call-start event");
        setIsSessionActive(true);
      });

      vapiInstance.on("call-end", () => {
        // console.log("useVapi: call-end event");
        setIsSessionActive(false);
        setConversation([]); // Reset conversation on call end
      });

      vapiInstance.on("volume-level", (volume: number) => {
        setVolumeLevel(volume);
      });

      vapiInstance.on("message", (message: any) => {
        if (message.type === "transcript") {
          setConversation((prev) => {
            const timestamp = new Date().toLocaleTimeString();
            const updatedConversation = [...prev];
            const existingMsgIndex = updatedConversation.findIndex(
              (msg) => msg.role === message.role && msg.isFinal === message.transcriptType
            );

            if (message.transcriptType === "final") {
              const partialIndex = updatedConversation.findIndex(
                (msg) => msg.role === message.role && !msg.isFinal,
              );
              if (partialIndex !== -1) {
                updatedConversation[partialIndex] = {
                  role: message.role,
                  text: message.transcript,
                  timestamp: updatedConversation[partialIndex].timestamp,
                  isFinal: true,
                };
              } else if (existingMsgIndex === -1) { // Add if no existing final message for this role
                updatedConversation.push({
                  role: message.role,
                  text: message.transcript,
                  timestamp,
                  isFinal: true,
                });
              }
            } else { // Partial transcript
              if (existingMsgIndex !== -1) {
                updatedConversation[existingMsgIndex] = {
                  ...updatedConversation[existingMsgIndex],
                  text: message.transcript,
                };
              } else if (updatedConversation.findIndex(msg => msg.role === message.role && !msg.isFinal) === -1) {
                updatedConversation.push({
                  role: message.role,
                  text: message.transcript,
                  timestamp,
                  isFinal: false,
                });
              }
            }
            return updatedConversation;
          });
        }

        if (
          message.type === "function-call" &&
          message.functionCall.name === "changeUrl"
        ) {
          const command = message.functionCall.parameters.url.toLowerCase();
          console.log("Function call changeUrl:", command);
          if (command) {
            window.location.href = command;
          } else {
            console.error("Unknown route for function call:", command);
          }
        }
      });

      vapiInstance.on("error", (e: Error) => {
        console.error("Vapi error in useVapi hook:", e);
      });
    }
  }, [publicKey]); // Re-initialize if publicKey changes (shouldn't happen often)

  useEffect(() => {
    initializeVapi();

    return () => {
      if (vapiRef.current) {
        // console.log("useVapi: Cleaning up Vapi instance");
        vapiRef.current.stop(); // Ensure call is stopped
        vapiRef.current = null; // Dispose of instance
      }
    };
  }, [initializeVapi]);

  const toggleCall = async () => {
    if (!vapiRef.current) {
      console.error("Vapi instance not initialized in toggleCall.");
      return;
    }
    if (!assistantId) {
      console.error("Assistant ID is not available in toggleCall.");
      return;
    }
    try {
      if (isSessionActive) {
        // console.log("useVapi: Stopping call via toggleCall");
        await vapiRef.current.stop();
      } else {
        // console.log("useVapi: Starting call with assistantId:", assistantId, "via toggleCall");
        await vapiRef.current.start(assistantId);
      }
    } catch (err) {
      console.error("Error toggling Vapi session:", err);
    }
  };

  // ... (sendMessage, say, toggleMute remain the same as you provided)
  const sendMessage = (role: string, content: string) => {
    if (vapiRef.current) {
      vapiRef.current.send({
        type: "add-message",
        message: { role, content },
      });
    }
  };

  const say = (message: string, endCallAfterSpoken = false) => {
    if (vapiRef.current) {
      vapiRef.current.say(message, endCallAfterSpoken);
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      const newMuteState = !isMuted;
      vapiRef.current.setMuted(newMuteState);
      setIsMuted(newMuteState);
    }
  };


  return {
    volumeLevel,
    isSessionActive,
    conversation,
    toggleCall,
    sendMessage,
    say,
    toggleMute,
    isMuted,
  };
};

export default useVapi;