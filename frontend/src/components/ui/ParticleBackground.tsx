"use client";

import { useCallback } from "react";
import Particles from "react-tsparticles";
import type { Engine } from "tsparticles-engine";
import { loadSlim } from "tsparticles-slim";

export default function EnhancedParticleBackground() {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        background: {
          opacity: 0,
        },
        particles: {
          number: {
            value: 80, // Slightly reduced for better performance with glow effects
            density: {
              enable: true,
              value_area: 800,
            },
          },
          color: {
            value: ["#FFCA40", "#6A98F0", "#4B6CB7", "#ffffff"],
          },
          opacity: {
            value: 0.7, // Increased base opacity
            random: true,
            anim: {
              enable: true,
              speed: 0.5,
              opacity_min: 0.2, // Higher minimum opacity
              sync: false,
            },
          },
          size: {
            value: 4, // Slightly larger particles
            random: true,
            anim: {
              enable: true,
              speed: 0.8,
              size_min: 0.1,
              sync: false,
            },
          },
          move: {
            enable: true,
            speed: 0.5,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
          },
          line_linked: {
            enable: false,
          },
          // Add shadow for extreme glow effect
          shadow: {
            enable: true,
            color: "#000000",
            blur: 15,
            offset: {
              x: 0,
              y: 0
            }
          },
          // Enhanced look with composite operations
          twinkle: {
            particles: {
              enable: true,
              frequency: 0.05,
              opacity: 1
            },
            lines: {
              enable: false,
            }
          },
        },
        // Enhanced interactivity for more dynamic glow
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: {
              enable: true,
              mode: "bubble",
            },
            onclick: {
              enable: true,
              mode: "repulse",
            },
            resize: true,
          },
          modes: {
            bubble: {
              distance: 150,
              size: 8, // Larger bubble size
              duration: 2,
              opacity: 1, // Full opacity on hover
              speed: 2,
            },
            repulse: {
              distance: 150,
              duration: 0.4,
            },
          },
        },
        // Add special composite blend modes for extreme glow
        backgroundMask: {
          enable: false,
          cover: {
            color: {
              value: "#000"
            },
            opacity: 1
          }
        },
        // Special glow effects for bright display
        particles: {
          groups: {
            z5000: {
              number: {
                value: 30
              },
              zIndex: {
                value: 5000
              }
            },
            z7500: {
              number: {
                value: 30
              },
              zIndex: {
                value: 75
              }
            },
            z2500: {
              number: {
                value: 50
              },
              zIndex: {
                value: 25
              }
            },
            z1000: {
              number: {
                value: 40
              },
              zIndex: {
                value: 10
              }
            }
          }
        },
        emitters: {
          position: {
            x: 50,
            y: 100
          },
          rate: {
            delay: 15,
            quantity: 1
          }
        },
        retina_detect: true,
      }}
      className="fixed inset-0 z-[5]"
    />
  );
}