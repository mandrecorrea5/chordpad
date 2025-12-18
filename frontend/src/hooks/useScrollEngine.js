import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for variable speed scroll engine
 * Calculates scroll speed based on BPM and bars for each section
 */
export function useScrollEngine(sections, isPlaying, onSectionComplete) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const scrollContainerRef = useRef(null);
  const contentRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const sectionStartTimeRef = useRef(null);
  const accumulatedTimeRef = useRef(0);
  const currentSectionIndexRef = useRef(0); // Use ref to avoid stale closures

  // Calculate total height and section positions
  const calculateSectionPositions = useCallback(() => {
    if (!contentRef.current || !scrollContainerRef.current) return [];
    
    const positions = [];
    const content = contentRef.current;
    let currentY = 0;
    
    sections.forEach((section, index) => {
      const sectionElement = content.querySelector(
        `[data-section-index="${index}"]`
      );
      if (sectionElement) {
        // Get height of the element
        const height = sectionElement.offsetHeight || sectionElement.getBoundingClientRect().height;
        
        // If height is 0, element might not be rendered yet
        if (height === 0) {
          console.warn(`Section ${index} has zero height`);
        }
        
        // Calculate position as accumulated height (this is the scrollTop value)
        const startY = currentY;
        const endY = currentY + height;
        
        positions.push({
          index,
          startY: startY,
          endY: endY,
          section,
          element: sectionElement,
          height: height
        });
        
        currentY = endY;
      }
    });
    
    return positions;
  }, [sections]);

  // Calculate scroll speed based on section BPM and bars
  const calculateScrollSpeed = useCallback((section) => {
    if (!section || !contentRef.current) return 0;
    
    const sectionElement = contentRef.current.querySelector(
      `[data-section-index="${currentSectionIndex}"]`
    );
    if (!sectionElement) return 0;
    
    const sectionHeight = sectionElement.offsetHeight;
    const sectionDuration = section.duration; // in milliseconds
    
    // Pixels per millisecond
    return sectionHeight / sectionDuration;
  }, [currentSectionIndex]);

  // Reset scroll engine
  const reset = useCallback(() => {
    setCurrentSectionIndex(0);
    currentSectionIndexRef.current = 0;
    setScrollPosition(0);
    setCurrentTime(0);
    accumulatedTimeRef.current = 0;
    sectionStartTimeRef.current = null; // Use null instead of 0 to distinguish from initialized state
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);
  
  // Don't sync ref with state - ref is the source of truth for animation
  // State is only for UI updates, ref is for animation logic

  // Main scroll animation loop
  useEffect(() => {
    if (!isPlaying || sections.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      startTimeRef.current = null;
      // Don't reset sectionStartTimeRef here - only reset it in the reset() function
      // This prevents issues with pending animation frames that might still be running
      return;
    }

    // Don't restart if already animating
    if (animationFrameRef.current) {
      console.log('Animation already running, skipping restart');
      return;
    }
    
    // Store sections in ref to avoid dependency issues
    const sectionsRefLocal = { current: sections };

    // Wait for DOM to render and ensure elements have height
    const timeoutId = setTimeout(() => {
      // Force layout recalculation
      if (contentRef.current) {
        contentRef.current.offsetHeight; // Trigger reflow
      }

      const sectionPositions = calculateSectionPositions();
      if (sectionPositions.length === 0) {
        console.warn('No section positions found. Sections:', sections.length);
        return;
      }
      
      const container = scrollContainerRef.current;
      console.log('Scroll engine started:', {
        sections: sectionPositions.length,
        containerScrollHeight: container.scrollHeight,
        containerClientHeight: container.clientHeight,
        canScroll: container.scrollHeight > container.clientHeight,
        positions: sectionPositions.map(p => ({ 
          index: p.index, 
          startY: Math.round(p.startY), 
          endY: Math.round(p.endY), 
          height: Math.round(p.height || p.endY - p.startY)
        }))
      });

      const animate = (timestamp) => {
        // Safety check: ensure this is the active animation frame
        if (animationFrameRef.current === null) {
          console.warn('Animation frame cancelled, stopping');
          return;
        }
        
        // Initialize timers only on first frame
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
          // Always initialize sectionStartTimeRef on first frame
          // Only set it if it's null (not already initialized)
          if (sectionStartTimeRef.current === null) {
            sectionStartTimeRef.current = timestamp;
          }
          console.log('Animation started, initial timestamp:', timestamp, 'sectionStartTime:', sectionStartTimeRef.current);
        }
        
        const elapsed = timestamp - startTimeRef.current;
        
        // Get current section using ref to avoid stale closures
        // Read the ref at the start of each frame to get the latest value
        const currentSections = sectionsRefLocal.current;
        
        // ALWAYS read the ref at the start of each frame to get the latest value
        // This ensures we use the updated index if it changed in the previous frame
        // CRITICAL: This must be the FIRST thing we do, before any other logic
        // Read it multiple times to ensure we get the latest value
        let currentIdx = currentSectionIndexRef.current;
        currentIdx = currentSectionIndexRef.current; // Read again to be absolutely sure
        
        // Debug: Always log the first few frames and when transitioning
        // This helps us see if the ref is being read correctly
        const refValue = currentSectionIndexRef.current;
        // Log more frequently around transitions
        if (elapsed < 100 || (elapsed > 8500 && elapsed < 10000)) {
          console.log('Frame start - reading index:', {
            currentIdx: currentIdx,
            refValue: refValue,
            areEqual: currentIdx === refValue,
            sectionStartTime: Math.round(sectionStartTimeRef.current),
            timestamp: Math.round(timestamp),
            sectionElapsed: Math.round(timestamp - sectionStartTimeRef.current),
            elapsed: Math.round(elapsed),
            currentSectionType: currentSections[currentIdx]?.type
          });
        }
        
        // CRITICAL: If they don't match, use the ref value (it's the source of truth)
        if (currentIdx !== refValue) {
          console.warn('Index mismatch detected! Using ref value:', refValue, 'instead of', currentIdx);
          currentIdx = refValue;
        }
        
        setCurrentTime(elapsed);
        
        // Ensure index is valid
        if (currentIdx >= currentSections.length) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
          return;
        }
        
        let currentSection = currentSections[currentIdx];
        if (!currentSection) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
          return;
        }

        // Calculate sectionElapsed AFTER getting currentIdx and currentSection
        // This ensures we use the correct timer for the current section
        // Safety: if sectionStartTime is null, initialize it to timestamp (should only happen on first frame)
        if (sectionStartTimeRef.current === null) {
          console.warn('sectionStartTime is null, initializing to timestamp:', timestamp);
          sectionStartTimeRef.current = timestamp;
        }
        let sectionElapsed = timestamp - sectionStartTimeRef.current;
        
        // Debug: log if sectionElapsed is always 0 (indicates sectionStartTime is being reset)
        if (sectionElapsed === 0 && elapsed > 100) {
          console.warn('sectionElapsed is 0 but elapsed > 100:', {
            sectionElapsed,
            elapsed,
            sectionStartTime: sectionStartTimeRef.current,
            timestamp,
            diff: timestamp - sectionStartTimeRef.current
          });
        }
        
        // Check if section is complete - if so, transition immediately
        // IMPORTANT: Check this BEFORE using sectionElapsed for calculations
        if (sectionElapsed >= currentSection.duration) {
          // Move to next section
          if (currentIdx < currentSections.length - 1) {
            const nextIndex = currentIdx + 1;
            
            console.log('Section complete, transitioning:', {
              from: currentIdx,
              to: nextIndex,
              sectionType: currentSection.type,
              sectionElapsed: Math.round(sectionElapsed),
              duration: Math.round(currentSection.duration),
              refBefore: currentSectionIndexRef.current,
              timestamp: Math.round(timestamp),
              sectionStartTimeBefore: Math.round(sectionStartTimeRef.current)
            });
            
            // Update ref FIRST - this is the source of truth
            currentSectionIndexRef.current = nextIndex;
            
            // Reset section timer to current timestamp IMMEDIATELY
            // This is critical - the next frame will calculate sectionElapsed from this point
            sectionStartTimeRef.current = timestamp;
            accumulatedTimeRef.current += sectionElapsed;
            
            // Update state (for UI, but ref is what we use for logic)
            setCurrentSectionIndex(nextIndex);
            
            if (onSectionComplete) {
              onSectionComplete(currentIdx);
            }
            
            console.log('After transition update:', {
              refAfter: currentSectionIndexRef.current,
              sectionStartTimeAfter: Math.round(sectionStartTimeRef.current),
              timestamp: Math.round(timestamp),
              expectedNextSectionElapsed: 0,
              nextSectionType: currentSections[nextIndex]?.type,
              nextSectionDuration: currentSections[nextIndex]?.duration
            });
            
            // IMPORTANT: Return immediately and let the next frame handle the new section
            // The next frame will read currentIdx from the ref (which is now nextIndex)
            // and calculate sectionElapsed from the reset sectionStartTimeRef
            // Don't cancel the current frame - just return and let the next frame process
            animationFrameRef.current = requestAnimationFrame(animate);
            return;
          } else {
            // All sections complete
            console.log('All sections complete');
            if (onSectionComplete) {
              onSectionComplete(currentIdx);
            }
            reset();
            return;
          }
        }

        // Recalculate positions in case content changed
        const updatedPositions = calculateSectionPositions();
        const sectionPosition = updatedPositions[currentIdx];
        
        if (!sectionPosition) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
          return;
        }

        // Calculate scroll speed for current section
        const sectionElement = contentRef.current?.querySelector(
          `[data-section-index="${currentIdx}"]`
        );
        if (!sectionElement) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }
        
        // Calculate scroll progress within current section (0 to 1)
        const sectionProgress = Math.min(sectionElapsed / currentSection.duration, 1.0);
        
        // Calculate scroll position within the section bounds
        const sectionHeight = sectionPosition.endY - sectionPosition.startY;
        const sectionScroll = sectionProgress * sectionHeight;
        const newScrollPosition = sectionPosition.startY + sectionScroll;
        
        // Ensure we don't exceed section bounds
        const clampedSectionPosition = Math.min(newScrollPosition, sectionPosition.endY);
        
        // Debug: log calculation details
        if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - 16) / 1000)) {
          console.log('Scroll calculation:', {
            section: currentIdx,
            sectionType: currentSection.type,
            sectionElapsed: Math.round(sectionElapsed),
            duration: Math.round(currentSection.duration),
            sectionProgress: (sectionProgress * 100).toFixed(1) + '%',
            sectionHeight: Math.round(sectionHeight),
            sectionScroll: Math.round(sectionScroll),
            startY: Math.round(sectionPosition.startY),
            endY: Math.round(sectionPosition.endY),
            newScrollPosition: Math.round(clampedSectionPosition),
          });
        }
        
        setScrollPosition(clampedSectionPosition);
        
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          
          // Calculate max scroll position
          const maxScroll = container.scrollHeight - container.clientHeight;
          const clampedPosition = Math.min(clampedSectionPosition, maxScroll);
          
          // Apply scroll using scrollTo for better compatibility
          if (container.scrollTo) {
            container.scrollTo({
              top: clampedPosition,
              behavior: 'auto'
            });
          } else {
            // Fallback for older browsers
            container.scrollTop = clampedPosition;
          }
          
          // Debug log (remove in production)
          if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - 16) / 1000)) {
            console.log('Scroll:', {
              section: currentIdx,
              targetPosition: Math.round(clampedSectionPosition),
              clampedPosition: Math.round(clampedPosition),
              actualScrollTop: Math.round(container.scrollTop),
              scrollHeight: container.scrollHeight,
              clientHeight: container.clientHeight,
              maxScroll: Math.round(maxScroll),
              canScroll: maxScroll > 0,
              sectionProgress: (sectionProgress * 100).toFixed(1) + '%',
              elapsed: Math.round(sectionElapsed)
            });
          }
          
          // Warn if scroll didn't work
          if (Math.abs(container.scrollTop - clampedPosition) > 5 && maxScroll > 0) {
            console.warn('Scroll not applied correctly:', {
              expected: clampedPosition,
              actual: container.scrollTop,
              diff: Math.abs(container.scrollTop - clampedPosition)
            });
          }
        }


        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }, 200); // Increased timeout to ensure DOM is ready

    return () => {
      clearTimeout(timeoutId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      startTimeRef.current = null;
    };
  }, [isPlaying, sections.length]);

  // Reset when sections change (but only if sections actually changed, not just recreated)
  // Use a ref to track the previous sections length to avoid unnecessary resets
  const prevSectionsLengthRef = useRef(sections.length);
  useEffect(() => {
    // Only reset if the length actually changed (new song selected)
    if (sections.length !== prevSectionsLengthRef.current) {
      prevSectionsLengthRef.current = sections.length;
      reset();
    }
  }, [sections.length, reset]);

  return {
    scrollPosition,
    currentSectionIndex,
    currentTime,
    scrollContainerRef,
    contentRef,
    reset
  };
}

