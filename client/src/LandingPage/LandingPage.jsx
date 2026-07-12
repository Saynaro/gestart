import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import Functions from "./components/Functions"
import LogoTrust from "./components/LogoTrust"
import Problem from "./components/Problem"
import { Particles } from "@/components/ui/particles";

function LandingPage() {
    return (
        <>
            <section>
                <Navbar />

                <div className=" h-full w-full overflow-hidden z-0">
                    <Particles
                        className="absolute inset-0 z-0"
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

                <div >
                    <Hero />

                </div>

                <div className="flex justify-center align-center mt-30 mb-10">
                    <LogoTrust />
                </div>

                <div className="problem-container">
                    <Problem />
                </div>

                {/* <div className="functions">
                    <Functions />

                </div> */}


            </section>
        </>

    )
}
export default LandingPage