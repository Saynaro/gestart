import "./Homepage.css";
import Header from "../components/Header";
import SideBar from "../components/SideBar";

const mockClients = [
    { name: "Jean Dupont", company: "AluTech SAS", email: "jean.dupont@alutech.fr", status: "Active" },
    { name: "Sophie Martin", company: "BatiConstruct", email: "s.martin@baticonstruct.fr", status: "En attente" },
    { name: "Pierre Leroy", company: "Chauffage Pro", email: "p.leroy@chauffagepro.fr", status: "Active" },
    { name: "Marie Dubois", company: "EcoEnergie", email: "m.dubois@ecoenergie.fr", status: "Active" },
    { name: "Thomas Petit", company: "Génie Climatique", email: "t.petit@genieclim.fr", status: "Désactivé" },
    { name: "Lucie Bernard", company: "ThermaAir", email: "l.bernard@thermaair.fr", status: "Active" },
    { name: "Antoine Richard", company: "Richard & Fils", email: "antoine@richardfils.fr", status: "En attente" },
    { name: "Julie Michel", company: "SolarLife", email: "j.michel@solarlife.fr", status: "Active" }
];

function HomePage() {
    return (
        <div className="home-page">
            <SideBar />
            <div className="main-content">
                <Header />
                <div className="page-content">
                    <div className="content-header">
                        <h1 className="content-title">Annuaire des Clients</h1>
                        <p className="content-subtitle">Gérez vos relations clients et les interventions associées.</p>
                    </div>

                    <div className="clients-grid">
                        {mockClients.map((client, index) => (
                            <div key={index} className="client-card">
                                <div className="client-avatar-badge">{client.name.split(" ").map(n => n[0]).join("")}</div>
                                <div className="client-info">
                                    <h3>{client.name}</h3>
                                    <span className="client-company">{client.company}</span>
                                    <span className="client-email">{client.email}</span>
                                </div>
                                <div className="client-status-wrapper">
                                    <span className={`status-pill ${client.status.toLowerCase().replace(" ", "-")}`}>
                                        {client.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {/* Repeat mock clients list to guarantee scroll height */}
                        {mockClients.map((client, index) => (
                            <div key={`dup-${index}`} className="client-card">
                                <div className="client-avatar-badge">{client.name.split(" ").map(n => n[0]).join("")}</div>
                                <div className="client-info">
                                    <h3>{client.name} (Archives)</h3>
                                    <span className="client-company">{client.company}</span>
                                    <span className="client-email">{client.email}</span>
                                </div>
                                <div className="client-status-wrapper">
                                    <span className="status-pill disabled">Archivé</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;