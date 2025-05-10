// hooks/use-vapi.ts

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Vapi from "@vapi-ai/web"; // Assuming this is the correct import for the Vapi class

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
  const vapiRef = useRef<Vapi | null>(null); // Typed Vapi instance from the import

  const initializeVapi = useCallback(() => {
    console.log("[useVapi] initializeVapi called.");
    // Ensure you log the actual values being used, with delimiters to see if they are empty/undefined
    console.log("[useVapi] Value of publicKey for new Vapi():", `---${publicKey}---`);
    console.log("[useVapi] Value of assistantId for vapi.start():", `---${assistantId}---`);

    if (!vapiRef.current && publicKey && publicKey.trim() !== "") {
      console.log("[useVapi] publicKey is valid, creating new Vapi instance.");
      try {
        const vapiInstance = new Vapi(publicKey); // Critical: SDK instantiation
        vapiRef.current = vapiInstance;

        vapiInstance.on("call-start", () => {
          console.log("[useVapi] Event: call-start");
          setIsSessionActive(true);
        });

        vapiInstance.on("call-end", () => {
          console.log("[useVapi] Event: call-end");
          setIsSessionActive(false);
          setConversation([]);
        });

        vapiInstance.on("volume-level", (volume: number) => {
          setVolumeLevel(volume);
        });

        vapiInstance.on("message", (message: any) => {
          // console.log("[useVapi] Event: message", message); // Can be noisy, enable if needed
          if (message.type === "transcript") {
            setConversation((prev) => {
              const timestamp = new Date().toLocaleTimeString();
              const updatedConversation = [...prev];
              const existingMsgIndex = updatedConversation.findIndex(
                (msg) => msg.role === message.role && msg.isFinal === (message.transcriptType === "final")
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
                } else if (existingMsgIndex === -1 || !updatedConversation[existingMsgIndex]?.isFinal) {
                  updatedConversation.push({
                    role: message.role,
                    text: message.transcript,
                    timestamp,
                    isFinal: true,
                  });
                } else if (existingMsgIndex !== -1) { // Update existing final if somehow needed
                    updatedConversation[existingMsgIndex].text = message.transcript;
                }
              } else { // Partial transcript
                const partialIndex = updatedConversation.findIndex(
                  (msg) => msg.role === message.role && !msg.isFinal,
                );
                if (partialIndex !== -1) {
                  updatedConversation[partialIndex] = {
                    ...updatedConversation[partialIndex],
                    text: message.transcript,
                  };
                } else { // Add new partial if no existing one
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
            console.log("[useVapi] Function call changeUrl:", command);
            if (command) {
              window.location.href = command;
            } else {
              console.error("[useVapi] Unknown route for function call:", command);
            }
          }
        });

        vapiInstance.on("error", (e: Error) => {
          console.error("[useVapi] Event: Vapi SDK error:", e);
        });
      } catch (sdkError) {
        console.error("[useVapi] Error during Vapi instantiation:", sdkError);
        vapiRef.current = null; // Ensure ref is null if instantiation failed
      }
    } else {
      if (!publicKey || publicKey.trim() === "") {
        console.error("[useVapi] Vapi initialization SKIPPED: publicKey is empty or invalid.");
      } else if (vapiRef.current) {
        console.log("[useVapi] Vapi instance already exists (initializeVapi called again).");
      }
    }
  }, [publicKey]); // Dependency: re-run if publicKey changes (should be stable after initial load)

  useEffect(() => {
    initializeVapi(); // Initialize on component mount

    return () => { // Cleanup function
      if (vapiRef.current) {
        console.log("[useVapi] Cleaning up Vapi instance on component unmount.");
        vapiRef.current.stop(); // Ensure call is stopped
        vapiRef.current = null; // Help with garbage collection
      }
    };
  }, [initializeVapi]); // Dependency: initializeVapi (which depends on publicKey)

  const toggleCall = async () => {
    console.log("[useVapi] toggleCall invoked. Current isSessionActive:", isSessionActive);

    if (!vapiRef.current) {
      console.error("[useVapi] toggleCall failed: Vapi instance not initialized. Attempting to re-initialize.");
      initializeVapi(); // Try to initialize if it wasn't
      if (!vapiRef.current) {
        console.error("[useVapi] toggleCall failed: Vapi instance STILL not initialized after re-attempt.");
        return;
      }
    }

    if (!assistantId || assistantId.trim() === "") {
      console.error("[useVapi] toggleCall failed: Assistant ID is missing or empty.");
      return;
    }

    try {
      if (isSessionActive) {
        console.log("[useVapi] Stopping call via toggleCall...");
        await vapiRef.current.stop();
      } else {
        console.log("[useVapi] Starting call with assistantId:", `---${assistantId}---`, "via toggleCall.");
        await vapiRef.current.start(assistantId);
      }
    } catch (err) {
      console.error("[useVapi] Error during toggleCall (start/stop operation):", err);
    }
  };

  const sendMessage = (role: string, content: string) => {
    if (vapiRef.current) {
      vapiRef.current.send({
        type: "add-message",
        message: { role, content },
      });
    } else {
      console.error("[useVapi] sendMessage failed: Vapi instance not initialized.");
    }
  };

  const say = (message: string, endCallAfterSpoken = false) => {
    if (vapiRef.current) {
      vapiRef.current.say(message, endCallAfterSpoken);
    } else {
      console.error("[useVapi] say failed: Vapi instance not initialized.");
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      const newMuteState = !isMuted;
      vapiRef.current.setMuted(newMuteState);
      setIsMuted(newMuteState);
    } else {
      console.error("[useVapi] toggleMute failed: Vapi instance not initialized.");
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