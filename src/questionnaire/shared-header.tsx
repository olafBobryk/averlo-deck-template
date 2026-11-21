"use client";

import { motion, type Transition } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

// Averlo next template Header/HeaderFull/HeaderCompact: 25px top band,
// 700ms scroll-intent tracking, exact height/scale targets and spring presets.
const getIsScrolled = () => window.scrollY > 25;
const macro: Transition = { type: "spring", stiffness: 180, damping: 26, mass: 0.45 };
const component: Transition = { type: "spring", stiffness: 260, damping: 28, mass: 0.35 };

export function SharedHeader({ brand, children, hasLanguageSwitcher = false }: { brand: ReactNode; children: ReactNode; hasLanguageSwitcher?: boolean }) {
 const [isScrolled, setIsScrolled] = useState(() => typeof window !== 'undefined' && getIsScrolled());
 const [compactViewport, setCompactViewport] = useState(() => typeof window !== 'undefined' && window.matchMedia("(max-width: 1023px)").matches);
 const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
 useEffect(() => {
  const query = window.matchMedia("(max-width: 1023px)");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const update = () => { setCompactViewport(query.matches); setReducedMotion(motionQuery.matches); };
  update();
  query.addEventListener("change", update);
  motionQuery.addEventListener("change", update);
  return () => { query.removeEventListener("change", update); motionQuery.removeEventListener("change", update); };
 }, []);
	useEffect(() => {
		let frameId: number | null = null;
		let followUntil = 0;

		const measure = () => {
			setIsScrolled((current) => {
				const next = getIsScrolled();
				return current === next ? current : next;
			});
		};

		const scheduleMeasure = () => {
			if (frameId !== null) return;

			frameId = window.requestAnimationFrame(() => {
				frameId = null;
				measure();

				if (performance.now() < followUntil) {
					scheduleMeasure();
				}
			});
		};

		const handleScrollIntent = () => {
			followUntil = performance.now() + 700;
			scheduleMeasure();
		};

		measure();
		window.addEventListener("scroll", scheduleMeasure, { passive: true });
		document.addEventListener("scroll", scheduleMeasure, {
			capture: true,
			passive: true,
		});
		window.addEventListener("wheel", handleScrollIntent, { passive: true });
		window.addEventListener("touchmove", handleScrollIntent, { passive: true });
		window.addEventListener("touchend", handleScrollIntent, { passive: true });
		window.addEventListener("keydown", handleScrollIntent);
		window.addEventListener("hashchange", handleScrollIntent);
		document.addEventListener(
			"scrollcontroller:anchor-scroll",
			handleScrollIntent,
		);

		return () => {
			if (frameId !== null) {
				window.cancelAnimationFrame(frameId);
			}
			window.removeEventListener("scroll", scheduleMeasure);
			document.removeEventListener("scroll", scheduleMeasure, {
				capture: true,
			});
			window.removeEventListener("wheel", handleScrollIntent);
			window.removeEventListener("touchmove", handleScrollIntent);
			window.removeEventListener("touchend", handleScrollIntent);
			window.removeEventListener("keydown", handleScrollIntent);
			window.removeEventListener("hashchange", handleScrollIntent);
			document.removeEventListener(
				"scrollcontroller:anchor-scroll",
				handleScrollIntent,
			);
		};
	}, []);

 const headerTransition = reducedMotion ? { duration: 0 } : macro;
 const heightTransition = reducedMotion ? { duration: 0 } : compactViewport ? component : macro;
 return <header className="top" data-language-switcher={hasLanguageSwitcher || undefined} data-site-header data-scrolled={isScrolled}>
  <motion.div aria-hidden="true" className="header-surface" initial={false} animate={{opacity:isScrolled?1:0}} transition={headerTransition}/>
  <motion.div className="top-inner" initial={false} animate={{height:compactViewport?(isScrolled?60:76):(isScrolled?70:100)}} transition={heightTransition}>
   <motion.div className="brand" initial={false} animate={{scale:isScrolled?(compactViewport?0.9:0.88):1}} transition={headerTransition}>{brand}</motion.div>
   <div className="header-right">{children}</div>
  </motion.div>
 </header>;
}
