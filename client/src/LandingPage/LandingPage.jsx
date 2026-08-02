import React, { useEffect } from "react";
import "./LandingPage.css";
import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import Functions from "./components/Functions"
import LogoTrust from "./components/LogoTrust"
import Problem from "./components/Problem"
import Solution from "./components/Solution"
import Comments from "./components/Comments"
import Tarifs from "./components/Tarifs"
import FAQ from "./components/FAQ"
import FinalCTA from "./components/FinalCTA"
import Footer from "./components/Footer"
import { Particles } from "@/components/ui/particles";

function LandingPage() {
    useEffect(() => {
        document.documentElement.style.overflow = "auto";
        document.body.style.overflow = "auto";
        document.documentElement.classList.remove("dark");

        return () => {
            document.documentElement.style.overflow = "";
            document.body.style.overflow = "";
            const savedTheme = localStorage.getItem("theme");
            if (savedTheme === "dark") {
                document.documentElement.classList.add("dark");
            }
        };
    }, []);

    return (
        <div className="landing-page-root" style={{ width: '100%', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
            <Navbar />

            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <Particles
                    className="absolute inset-0 z-0 pointer-events-none"
                    quantity={100}
                    staticity={50}
                    ease={50}
                    size={0.2}
                    refresh={false}
                    color="#000000ff"
                    vx={0}
                    vy={0}
                />
            </div>

            <div id="hero" style={{ position: 'relative', zIndex: 1 }}>
                <Hero />
            </div>

            <div className="flex justify-center align-center mt-30" style={{ position: 'relative', zIndex: 1 }}>
                <LogoTrust />
            </div>

            <div className="problem-container" style={{ position: 'relative', zIndex: 1 }}>
                <Problem />
            </div>

            <div className="solution-container" id="about" style={{ position: 'relative', zIndex: 1 }}>
                <Solution />
            </div>

            <div className="functions" id="features" style={{ position: 'relative', zIndex: 1 }}>
                <Functions />
            </div>

            <div className="comments-container" style={{ position: 'relative', zIndex: 1 }}>
                <Comments />
            </div>

            <div className="tarifs-container" style={{ position: 'relative', zIndex: 1 }}>
                <Tarifs />
            </div>

            <div className="faq-wrapper-section" style={{ position: 'relative', zIndex: 1 }}>
                <FAQ />
            </div>

            <div className="final-cta-wrapper" style={{ position: 'relative', zIndex: 1 }}>
                <FinalCTA />
            </div>

            <div className="footer-wrapper" style={{ position: 'relative', zIndex: 1 }}>
                <Footer />
            </div>
        </div>
    )
}
export default LandingPage