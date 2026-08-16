import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Check, Wrench, Sparkles, Snowflake, Flame, Droplet, Wind, Sun, Zap, TreePine, ChevronRight, ChevronLeft, X, Edit3 } from 'lucide-react';
import { apiFetch } from '../utils/api';
import './EquipmentSelector.css';

export const EQUIPMENT_CATALOG = {
    clim: {
        id: 'clim',
        name: 'Climatisation / PAC air-air',
        icon: Snowflake,
        brands: ['Daikin', 'Mitsubishi Electric', 'Atlantic', 'Panasonic', 'Toshiba', 'LG', 'Hitachi', 'Samsung', 'Carrier', 'Gree', 'Midea'],
        models: [
            { brand: 'Daikin', model: 'Sensira Inverter (FTXF25 / FTXF35 / FTXF50)', type: 'Mural', power: '2.5kW à 5.0kW' },
            { brand: 'Daikin', model: 'Perfera R32 (FTXM20 / FTXM25 / FTXM35 / FTXM50)', type: 'Mural Haut de Gamme', power: '2.0kW à 5.0kW' },
            { brand: 'Daikin', model: 'Stylish R32 Ultra Compact (FTXA25 / FTXA35 / FTXA50)', type: 'Mural Design', power: '2.5kW à 5.0kW' },
            { brand: 'Daikin', model: 'Emura 3 Design (FTXJ25 / FTXJ35 / FTXJ50)', type: 'Mural Premium', power: '2.5kW à 5.0kW' },
            { brand: 'Daikin', model: 'Multisplit Multi-Plus (2MXM40 / 3MXM52 / 4MXM68 / 5MXM90)', type: 'Multisplit', power: '4.0kW à 9.0kW' },
            { brand: 'Daikin', model: 'Gainable Slim Inverter (FDXM25 / FDXM35 / FBA50)', type: 'Gainable', power: '2.5kW à 7.1kW' },
            { brand: 'Daikin', model: 'Console Nexura / FVXM (Double flux rayonnant)', type: 'Console Basse', power: '2.5kW à 5.0kW' },

            { brand: 'Mitsubishi Electric', model: 'Essentiel MSZ-HR (HR25 / HR35 / HR50)', type: 'Mural', power: '2.5kW à 5.0kW' },
            { brand: 'Mitsubishi Electric', model: 'Compact MSZ-AP (AP25 / AP35 / AP42 / AP50)', type: 'Mural Ultra-Silencieux', power: '2.5kW à 5.0kW' },
            { brand: 'Mitsubishi Electric', model: 'Design MSZ-EF (Blanc / Noir / Argent)', type: 'Mural Design', power: '2.5kW à 5.0kW' },
            { brand: 'Mitsubishi Electric', model: 'Luxury MSZ-LN Hyper Heating (Capteur 3D i-See)', type: 'Mural Grand Froid', power: '2.5kW à 5.0kW' },
            { brand: 'Mitsubishi Electric', model: 'Multisplit MXZ (MXZ-2F53 / MXZ-3F68 / MXZ-4F83)', type: 'Multisplit', power: '5.3kW à 8.3kW' },
            { brand: 'Mitsubishi Electric', model: 'Gainable Compact SEZ-M / PEAD-M', type: 'Gainable', power: '2.5kW à 10.0kW' },
            { brand: 'Mitsubishi Electric', model: 'Console MFZ-KT (Chauffage sol rapide)', type: 'Console Basse', power: '2.5kW à 5.0kW' },

            { brand: 'Atlantic', model: 'Takao M1 / M2 ECO Inverter (ASYG 09 / 12 / 14)', type: 'Mural', power: '2.5kW à 4.0kW' },
            { brand: 'Atlantic', model: 'Takao Line / Takao Stylist (Design épuré)', type: 'Mural Connecté', power: '2.5kW à 4.2kW' },
            { brand: 'Atlantic', model: 'Gainable Shogun / Zone Control 2.0 (Régulation pièce par pièce)', type: 'Gainable Connecté', power: '5.2kW à 12.5kW' },
            { brand: 'Atlantic', model: 'Multisplit AOYG (2 à 5 sorties)', type: 'Multisplit', power: '4.0kW à 10.0kW' },

            { brand: 'Panasonic', model: 'Etherea R32 avec nanoe™X (CS-Z25 / CS-Z35 / CS-Z50)', type: 'Mural Purification', power: '2.5kW à 5.0kW' },
            { brand: 'Panasonic', model: 'Compact BZ / TZ Inverter', type: 'Mural Compact', power: '2.5kW à 5.0kW' },
            { brand: 'Panasonic', model: 'Gainable Basse Pression CS-Z', type: 'Gainable', power: '2.5kW à 7.1kW' },

            { brand: 'Toshiba', model: 'Seiya R32 Ultra-Silencieux (RAS-B10 / B13 / B16)', type: 'Mural', power: '2.5kW à 4.6kW' },
            { brand: 'Toshiba', model: 'Shorai Edge R32 avec filtre Ultra Pure', type: 'Mural Haut de Gamme', power: '2.5kW à 5.0kW' },
            { brand: 'Toshiba', model: 'Haori (Habillage textile personnalisable)', type: 'Mural Design', power: '2.5kW à 4.6kW' },
            { brand: 'Toshiba', model: 'Gainable SDI / DI Inverter', type: 'Gainable', power: '3.6kW à 10.0kW' },

            { brand: 'LG', model: 'Standard Plus Dual Inverter (PC09 / PC12 / PC18)', type: 'Mural', power: '2.5kW à 5.0kW' },
            { brand: 'LG', model: 'Artcool Mirror / Gallery Dual Inverter', type: 'Mural Tableau / Miroir', power: '2.5kW à 3.5kW' },

            { brand: 'Hitachi', model: 'airHome 400 / 600 avec FrostWash autonettoyant', type: 'Mural Connecté', power: '2.5kW à 5.0kW' },
            { brand: 'Hitachi', model: 'Mokai R32 Compact / Dodai 2', type: 'Mural', power: '2.5kW à 4.2kW' },
            { brand: 'Hitachi', model: 'Gainable RAD / RPI basse pression', type: 'Gainable', power: '3.5kW à 7.0kW' },

            { brand: 'Samsung', model: 'WindFree™ Comfort / Elite (Sans courant d\'air)', type: 'Mural Micro-perforé', power: '2.5kW à 5.0kW' },
            { brand: 'Carrier', model: 'Infinity / QHG XPower Inverter R32', type: 'Mural', power: '2.6kW à 5.3kW' },
            { brand: 'Gree', model: 'Lomo / Fairy R32 Inverter', type: 'Mural', power: '2.7kW à 5.2kW' },
            { brand: 'Midea', model: 'All Easy Pro / Breezeless Inverter', type: 'Mural', power: '2.6kW à 5.3kW' }
        ]
    },

    pac: {
        id: 'pac',
        name: 'Pompe à chaleur air-eau',
        icon: Flame,
        brands: ['Atlantic', 'Daikin', 'Mitsubishi Electric', 'Viessmann', 'Saunier Duval', 'Panasonic', 'Vaillant', 'De Dietrich', 'Bosch', 'Auer', 'Hitachi'],
        models: [
            { brand: 'Atlantic', model: 'Alféa Extensa A.I. R32 (Extensa 5 / 6 / 8 / 10)', type: 'Bi-bloc Basse Température', power: '5kW à 10kW' },
            { brand: 'Atlantic', model: 'Alféa Extensa Duo A.I. R32 (avec ECS 190L)', type: 'Double Service (Chauffage + ECS)', power: '5kW à 10kW' },
            { brand: 'Atlantic', model: 'Alféa Excellia A.I. (Excellia 11 / 14 / 16)', type: 'Haute Température Randonnée', power: '11kW à 16kW' },
            { brand: 'Atlantic', model: 'Alféa Excellia Duo A.I. (avec ballon ECS 190L intégré)', type: 'Double Service Haute Temp', power: '11kW à 16kW' },
            { brand: 'Atlantic', model: 'Loria / Loria Duo R32 Compact', type: 'Bi-bloc Compact', power: '4kW à 10kW' },

            { brand: 'Daikin', model: 'Altherma 3 H HT (Haute Température 70°C Gaz R32)', type: 'Bi-bloc Rénovation', power: '14kW à 18kW' },
            { brand: 'Daikin', model: 'Altherma 3 H HT Éco (Double service ballon 180L / 230L)', type: 'Tour Hydraulique', power: '14kW à 18kW' },
            { brand: 'Daikin', model: 'Altherma 3 M (Monobloc extérieur R32)', type: 'Monobloc', power: '4kW à 16kW' },
            { brand: 'Daikin', model: 'Altherma 3 R (Basse Température Plancher chauffant)', type: 'Bi-bloc Neuf / BBC', power: '4kW à 10kW' },

            { brand: 'Mitsubishi Electric', model: 'Ecodan Hydrobox Duo R32 (Ballon ECS 200L / 300L)', type: 'Tour Hydraulique', power: '6kW à 12kW' },
            { brand: 'Mitsubishi Electric', model: 'Ecodan Zubadan Silence Haute Température 60°C', type: 'Grand Froid -28°C', power: '8kW à 14kW' },
            { brand: 'Mitsubishi Electric', model: 'Ecodan Power Inverter (Hydrobox simple)', type: 'Chauffage Seul', power: '6kW à 11kW' },

            { brand: 'Viessmann', model: 'Vitocal 250-A / 252-A Monobloc (70°C Gaz R290 Vert)', type: 'Monobloc Écologique', power: '6kW à 13kW' },
            { brand: 'Viessmann', model: 'Vitocal 200-S / 222-S Split (avec ECS 220L)', type: 'Split Basse Température', power: '4kW à 12kW' },
            { brand: 'Viessmann', model: 'Vitocal 150-A Monobloc R290', type: 'Monobloc Rénovation', power: '4kW à 10kW' },

            { brand: 'Saunier Duval', model: 'GeniaAir Max (Monobloc R290 Haute Température 75°C)', type: 'Monobloc Ultra-Silencieux', power: '4kW à 15kW' },
            { brand: 'Saunier Duval', model: 'GeniaAir Split (3 / 5 / 7 / 10 / 12)', type: 'Bi-bloc Basse Temp', power: '3kW à 12kW' },
            { brand: 'Saunier Duval', model: 'GeniaSet Max / Split (Colonne hydraulique avec ECS 190L)', type: 'Double Service', power: '4kW à 15kW' },

            { brand: 'Panasonic', model: 'Aquarea Haute Performance Génération K/L (R32/R290)', type: 'Bi-bloc / All-in-One', power: '5kW à 12kW' },
            { brand: 'Panasonic', model: 'Aquarea T-CAP Génération H (Maintien puissance par -20°C)', type: 'Grand Froid', power: '9kW à 16kW' },

            { brand: 'Vaillant', model: 'aroTHERM plus Monobloc (Gaz Naturel R290 75°C)', type: 'Monobloc Haute Temp', power: '4kW à 15kW' },
            { brand: 'Vaillant', model: 'uniTOWER plus (avec ballon ECS 190L)', type: 'Tour Hydraulique', power: '4kW à 15kW' },

            { brand: 'De Dietrich', model: 'Alezio S R32 / Alezio S V200 (avec ECS 200L)', type: 'Bi-bloc Basse Temp', power: '4.5kW à 11kW' },
            { brand: 'De Dietrich', model: 'HPI S Inverter Haute Performance', type: 'Split Rénovation', power: '6kW à 16kW' },

            { brand: 'Bosch', model: 'Compress 7000i AW (Monobloc design)', type: 'Monobloc', power: '5kW à 17kW' },
            { brand: 'Bosch', model: 'Compress 3400i AWS Split', type: 'Bi-bloc', power: '4kW à 14kW' },

            { brand: 'Auer', model: 'HRC70 Haute Température 70°C Modulante', type: 'Monobloc Forte Puissance', power: '7kW à 25kW' },
            { brand: 'Hitachi', model: 'Yutaki S / S Combi R32 (avec ECS intégrée)', type: 'Split', power: '4.3kW à 16kW' }
        ]
    },

    cet: {
        id: 'cet',
        name: 'Chauffe-Eau Thermodynamique (CET)',
        icon: Droplet,
        brands: ['Atlantic', 'Thermor', 'Ariston', 'De Dietrich', 'Saunier Duval', 'Auer', 'Daikin', 'Aldes'],
        models: [
            { brand: 'Atlantic', model: 'Calypso Connecté Mural (100L / 150L / 200L)', type: 'Mural sur air ambiant/extérieur', power: '100L - 200L' },
            { brand: 'Atlantic', model: 'Calypso Connecté Sur Socle (200L / 250L)', type: 'Vertical Sol', power: '200L - 250L' },
            { brand: 'Atlantic', model: 'Explorer Connecté R513A (200L / 270L)', type: 'Sol Haut Rendement', power: '200L - 270L' },
            { brand: 'Atlantic', model: 'Égéo Connecté Vertical (200L / 250L)', type: 'Remplacement Standard', power: '200L - 250L' },

            { brand: 'Thermor', model: 'Aéromax 5 Connecté (100L / 150L / 200L / 250L)', type: 'Sur air ambiant ou gainé', power: '100L - 250L' },
            { brand: 'Thermor', model: 'Aéromax Split 3 (avec unité extérieure)', type: 'Split Silencieux', power: '200L - 270L' },
            { brand: 'Thermor', model: 'Duralis ACI Hybride Stéatite', type: 'Stéatite Électrique Pro', power: '150L - 300L' },

            { brand: 'Ariston', model: 'Nuos Plus WiFi R290 (200L / 250L)', type: 'Connecté Classe A+', power: '200L - 250L' },
            { brand: 'Ariston', model: 'Nuos Primo Mural (80L / 110L / 200L / 240L)', type: 'Mural Compact', power: '80L - 240L' },
            { brand: 'Ariston', model: 'Lydos Hybrid WiFi (80L / 100L Hybride)', type: 'Ultra Compact Mural', power: '80L - 100L' },

            { brand: 'De Dietrich', model: 'Kaliko Essentiel TWH (200L / 250L)', type: 'Vertical Sol', power: '200L - 250L' },
            { brand: 'Saunier Duval', model: 'Magna Aqua 150 / 200 / 270', type: 'Gainé ou ambiant', power: '150L - 270L' },
            { brand: 'Auer', model: 'Edel Air / Edel Eau R290 (80L / 100L / 150L / 200L / 270L)', type: 'Cuve Inox Garantie 10 ans', power: '80L - 270L' },
            { brand: 'Daikin', model: 'Altherma M HW (200L / 260L)', type: 'Vertical Sol', power: '200L - 260L' },
            { brand: 'Aldes', model: 'T.Flow Hygro+ / T.Flow Nano (Chauffe-eau sur VMC)', type: 'CET + VMC Combiné', power: '100L - 200L' }
        ]
    },

    chaudiere: {
        id: 'chaudiere',
        name: 'Chaudière gaz / fioul',
        icon: Zap,
        brands: ['Saunier Duval', 'Viessmann', 'De Dietrich', 'ELM Leblanc', 'Vaillant', 'Chappée', 'Frisquet', 'Bosch'],
        models: [
            { brand: 'Saunier Duval', model: 'ThemaFast Condens (F25 / F30 / F35)', type: 'Murale Condensation Gaz', power: '25kW à 35kW' },
            { brand: 'Saunier Duval', model: 'ThemaPlus Condens (Micro-accumulation)', type: 'Murale Eau Chaude Instantanée', power: '25kW à 30kW' },
            { brand: 'Saunier Duval', model: 'IsoMax Condens (Double ballon 21L intégré)', type: 'Murale Grand Confort Sanitaire', power: '30kW à 35kW' },
            { brand: 'Saunier Duval', model: 'IsoTwin Condens (2 ballons inox 42L)', type: 'Murale Double Service', power: '25kW à 30kW' },

            { brand: 'Viessmann', model: 'Vitodens 100-W / 111-W (avec ballon inox 46L)', type: 'Murale Gaz Condensation', power: '19kW à 32kW' },
            { brand: 'Viessmann', model: 'Vitodens 200-W / 222-F (Connectée avec écran tactile)', type: 'Haut de gamme connectée', power: '13kW à 32kW' },
            { brand: 'Viessmann', model: 'Vitorondens 200-T (Condensation Fioul)', type: 'Chaudière Sol Fioul', power: '20kW à 53kW' },

            { brand: 'De Dietrich', model: 'Innovens MCA (15 / 25 / 35)', type: 'Murale Gaz Haute Efficacité', power: '15kW à 35kW' },
            { brand: 'De Dietrich', model: 'Vivadens MCR Plus (24 / 34 / 39)', type: 'Murale Compacte', power: '24kW à 39kW' },
            { brand: 'De Dietrich', model: 'Naneo S EMC-S (Format mini ultra-léger)', type: 'Murale Ultra Compacte', power: '24kW à 34kW' },
            { brand: 'De Dietrich', model: 'Evodens AMC / Modulens O (Fioul Condensation)', type: 'Chaudière Sol', power: '15kW à 30kW' },

            { brand: 'ELM Leblanc', model: 'Megalis i Condens (GVA C 24 / 30)', type: 'Murale Condensation', power: '24kW à 30kW' },
            { brand: 'ELM Leblanc', model: 'Egalis Ballon Condens (Ballon 42L)', type: 'Murale avec accumulation', power: '24kW à 30kW' },

            { brand: 'Vaillant', model: 'ecoTEC plus / ecoTEC pro (VUW 25 / 30 / 35)', type: 'Murale Condensation', power: '25kW à 35kW' },
            { brand: 'Vaillant', model: 'ecoCOMPACT / ecoVIT (Chaudière sol condensation)', type: 'Chaudière Sol Gaz', power: '20kW à 35kW' },

            { brand: 'Frisquet', model: 'Hydromotrix Condensation Visio (25 / 32 / 45 kW)', type: 'Corps de chauffe cuivre 100%', power: '25kW à 45kW' },
            { brand: 'Frisquet', model: 'Hydroconfort Condensation Visio (Ballon inox 80L/120L)', type: 'Accumulation Sanitaire Cuivre', power: '25kW à 32kW' },
            { brand: 'Frisquet', model: 'Prestige Condensation Visio (Chaudière Sol)', type: 'Chaudière Sol Gaz', power: '25kW à 45kW' },

            { brand: 'Chappée', model: 'Initia + HTE / Duo HTE (24 / 28 / 33 kW)', type: 'Murale Condensation', power: '24kW à 33kW' }
        ]
    },

    vmc: {
        id: 'vmc',
        name: 'Ventilation mécanique (VMC)',
        icon: Wind,
        brands: ['Aldes', 'Atlantic', 'Unelvent (S&P)', 'Anjos', 'Zehnder'],
        models: [
            { brand: 'Aldes', model: 'EasyHOME Hygro Classic / Premium MW (Basse Conso)', type: 'Simple Flux Hygroréglable', power: 'T1 à T7 (jusqu\'à 6 sanitaires)' },
            { brand: 'Aldes', model: 'EasyHOME Auto (Simple flux autoréglable)', type: 'Simple Flux Autoréglable', power: 'T1 à T7' },
            { brand: 'Aldes', model: 'InspirAIR Top 300 / 450 (Double flux connectée purification)', type: 'Double Flux Haut Rendement', power: 'Rendement 96%' },
            { brand: 'Aldes', model: 'Dee Fly Cube 300 (Double flux certifiée Passivhaus)', type: 'Double Flux', power: 'Jusqu\'à 300 m³/h' },

            { brand: 'Atlantic', model: 'Hygro Cosy / Hygro Cosy BC (Moteur EC Basse Conso)', type: 'Simple Flux Hygro', power: '1 à 6 sanitaires' },
            { brand: 'Atlantic', model: 'Autocosy iH / Duocosy', type: 'Simple Flux Auto Intelligente', power: '1 à 4 sanitaires' },
            { brand: 'Atlantic', model: 'Duolix Max / Optimocosy HR Plus (Double flux 92%)', type: 'Double Flux Connectée', power: 'Rendement 92%' },

            { brand: 'Unelvent (S&P)', model: 'OZEO Flat Auto / Hygro 2 (Extra-plat combles/plafond)', type: 'Extra-Plate Combles', power: '1 à 6 sanitaires' },
            { brand: 'Unelvent (S&P)', model: 'IDEO 325 Ecowatt (Double flux rendement 95%)', type: 'Double Flux', power: 'Jusqu\'à 325 m³/h' },

            { brand: 'Zehnder', model: 'ComfoAir Q350 / Q450 / Q600 (Certifié Maison Passive)', type: 'Double Flux Ultra-Silencieuse', power: 'Rendement 98%' },
            { brand: 'Anjos', model: 'Isobox Hygro Pavillonnaire', type: 'Simple Flux', power: '1 à 5 piquages' }
        ]
    },

    solaires: {
        id: 'solaires',
        name: 'Panneaux solaires photovoltaïques',
        icon: Sun,
        brands: ['Enphase', 'SolarEdge', 'Huawei', 'Fronius', 'DualSun', 'SunPower', 'Trina Solar', 'Longi'],
        models: [
            { brand: 'Enphase', model: 'Micro-onduleur Enphase IQ8+ / IQ8M / IQ8AC / IQ8HC', type: 'Micro-Onduleur Réseau', power: '300VA à 380VA' },
            { brand: 'Enphase', model: 'Passerelle Envoy-S Metered + Batterie IQ Battery 5P', type: 'Gestion & Stockage Batterie', power: '5.0kWh Stockage' },

            { brand: 'SolarEdge', model: 'Onduleur monophasé HD-Wave (HD-3000 / HD-6000)', type: 'Onduleur Centralisé Optimisé', power: '3.0kW à 6.0kW' },
            { brand: 'SolarEdge', model: 'Optimiseurs de puissance S440 / S500 / P850', type: 'Optimiseur par panneau', power: '440W à 850W' },
            { brand: 'SolarEdge', model: 'Home Hub Onduleur Hybride + Batterie SolarEdge 10kWh', type: 'Onduleur Hybride + Batterie', power: '5kW à 10kW' },

            { brand: 'Huawei', model: 'Onduleur Hybride SUN2000 (3KTL / 5KTL / 6KTL-L1)', type: 'Onduleur Hybride Haute Tension', power: '3kW à 6kW' },
            { brand: 'Huawei', model: 'Batterie LUNA2000 (Module 5kWh extensible à 15kWh)', type: 'Batterie Lithium LiFePO4', power: '5kWh à 15kWh' },

            { brand: 'Fronius', model: 'Primo GEN24 Plus Hybride (3.0 à 6.0 kW)', type: 'Onduleur Hybride Monophasé', power: '3.0kW à 6.0kW' },
            { brand: 'DualSun', model: 'Panneau FLASH Shingle Black (425W / 500W)', type: 'Panneau Monocristallin Full Black', power: '425W - 500W' },
            { brand: 'DualSun', model: 'Panneau SPRING Hybride (Photovoltaïque + Solaire thermique eau chaude)', type: 'Panneau 2-en-1 PVT', power: '375W + Thermique' },
            { brand: 'SunPower', model: 'Maxeon 3 / Maxeon 6 Black (Garantie 40 ans)', type: 'Cellules Interdigitées Premium', power: '400W à 440W' },
            { brand: 'Trina Solar', model: 'Vertex S+ N-Type Dual Glass (435W / 445W)', type: 'Panneau Bi-verre N-Type', power: '435W à 445W' },
            { brand: 'Longi', model: 'Hi-MO 6 Explorer / Scientist (415W / 430W Full Black)', type: 'Panneau HPBC Haute Efficacité', power: '415W à 430W' }
        ]
    },

    poele: {
        id: 'poele',
        name: 'Poêle & insert bois / granulés',
        icon: TreePine,
        brands: ['Palazzetti', 'MCZ', 'Invicta', 'Jotul', 'Hoben', 'Edilkamin', 'Godin'],
        models: [
            { brand: 'Palazzetti', model: 'Ecofire Cesare / Marianne / Jackie (6kW / 9kW / 12kW)', type: 'Poêle à granulés étanche', power: '6kW à 12kW' },
            { brand: 'Palazzetti', model: 'Ecofire Beatrice / Brian étanche canalisable', type: 'Canalisable Multi-pièces', power: '9kW à 12kW' },

            { brand: 'MCZ', model: 'Musa / Club / Suite Maestro+ (8kW / 10kW / 12kW / 14kW)', type: 'Poêle Granulés Connecté', power: '8kW à 14kW' },
            { brand: 'MCZ', model: 'Cute / Ray / Ego Air (Flamme naturelle silencieuse)', type: 'Air Confort Silencieux', power: '6kW à 10kW' },

            { brand: 'Invicta', model: 'Mandor / Remilly / Ove (Fonte brute traditionnelle)', type: 'Poêle à bois bûches', power: '7kW à 12kW' },
            { brand: 'Invicta', model: 'Lodi / Gomont / Nola (Pellets étanche)', type: 'Poêle à granulés étanche', power: '6kW à 10kW' },

            { brand: 'Jotul', model: 'Jotul F 373 Advance / F 105 / F 500 (Fonte Norvégienne)', type: 'Poêle à bois scandinave', power: '6kW à 11kW' },
            { brand: 'Jotul', model: 'Jotul PF 730 / PF 920 (Granulés étanche)', type: 'Poêle à granulés Fonte', power: '7kW à 9kW' },

            { brand: 'Hoben', model: 'H5 / H7 Evolution (Silence absolu Fabrication France)', type: 'Poêle Granulés Régulation PBI', power: '6kW à 10kW' },
            { brand: 'Edilkamin', model: 'Cherie EVO / Slide / Blade (Granulés gain de place)', type: 'Extra-plat couloir', power: '8kW à 12kW' }
        ]
    },

    elec: {
        id: 'elec',
        name: 'Tableau électrique & Bornes',
        icon: Zap,
        brands: ['Schneider Electric', 'Legrand', 'Hager', 'Wallbox', 'ABB'],
        models: [
            { brand: 'Schneider Electric', model: 'Tableau Resi9 Modulaire (1 à 4 rangées 13/18 modules)', type: 'Tableau Résidentiel NF C 15-100', power: '13 à 72 modules' },
            { brand: 'Schneider Electric', model: 'Borne de recharge EVlink Home (7.4kW / 11kW avec délestage)', type: 'Borne Véhicule Électrique', power: '7.4kW - 11kW' },
            { brand: 'Schneider Electric', model: 'Wiser IP (Passerelle gestion d\'énergie connectée)', type: 'Domotique RT2012/RE2020', power: 'Mesure & Pilotage' },

            { brand: 'Legrand', model: 'Tableau Drivia 13 / 18 modules (avec borniers IP2X)', type: 'Tableau Résidentiel', power: '1 à 4 rangées' },
            { brand: 'Legrand', model: 'Borne Green\'up Premium (3.7kW à 22kW monophasé/triphasé)', type: 'Borne de recharge connectée', power: '3.7kW à 22kW' },
            { brand: 'Legrand', model: 'Prise renforcée Green\'up Access avec disjoncteur', type: 'Prise sécurisée 3.7kW', power: '16A - 3.7kW' },

            { brand: 'Hager', model: 'Tableau Gamma+ (1 à 4 rangées avec capot translucide)', type: 'Tableau d\'abonné', power: '13 à 72 modules' },
            { brand: 'Hager', model: 'Borne Witty XEV (7kW à 22kW avec délestage dynamique)', type: 'Borne IP54 Extérieur', power: '7kW - 22kW' },

            { brand: 'Wallbox', model: 'Pulsar Plus / Pulsar Max (7.4kW / 22kW avec câble intégré)', type: 'Borne Compacte Connectée', power: '7.4kW à 22kW' },
            { brand: 'ABB', model: 'Terra AC Wallbox (7.4kW / 11kW / 22kW avec RFID & WiFi)', type: 'Borne Pro & Résidentiel', power: '7.4kW à 22kW' }
        ]
    },

    plombier: {
        id: 'plombier',
        name: 'Plomberie & Sanitaire',
        icon: Wrench,
        brands: ['Atlantic', 'Thermor', 'Grundfos', 'Wilo', 'Geberit', 'Grohe', 'Hansgrohe'],
        models: [
            { brand: 'Atlantic', model: 'Chauffe-eau Chaufféo Plus Stéatite (150L / 200L / 300L)', type: 'Chauffe-eau Électrique Stéatite', power: '150L - 300L' },
            { brand: 'Thermor', model: 'Duralis ACI Hybride Anti-corrosion (150L / 200L / 300L)', type: 'Chauffe-eau Haut de Gamme', power: '150L - 300L' },
            { brand: 'Grundfos', model: 'Circulateur ALPHA1 L / ALPHA2 (Régulation automatique)', type: 'Circulateur Chauffage Haute Efficacité', power: 'Basse Conso 3W-45W' },
            { brand: 'Grundfos', model: 'Station de relevage Sololift2 (WC, Douche, Cuisine)', type: 'Pompe de relevage eaux usées', power: 'Puissance 620W' },
            { brand: 'Wilo', model: 'Yonos PICO / Stratos PICO (Circulateur haut rendement)', type: 'Circulateur ECS & Chauffage', power: '4W à 40W' },
            { brand: 'Geberit', model: 'Bâti-support Duofix Sigma 12cm (WC Suspendu autoportant)', type: 'Bâti-Support Sanitaire', power: 'Chasse double touche 3L/6L' },
            { brand: 'Grohe', model: 'Rapid SL Bâti autoportant + Plaque Skate Cosmopolitan', type: 'Bâti WC Suspendu', power: 'Hauteur 1.13m' },
            { brand: 'Grohe', model: 'SmartControl Thermostatique encastré / apparent', type: 'Colonne de douche thermostatique', power: 'Régulation précise' }
        ]
    }
};

/**
 * Reusable EquipmentSelector Component
 * Allows searching by model, brand, trade category, with an easy "Autre" option for custom entry.
 */
export default function EquipmentSelector({
    value = '',
    onChange,
    placeholder = "ex: Daikin Perfera 3.5kW Inverter",
    defaultTradeSlug = 'clim',
    userTradeSlugs = []
}) {
    const [selectedTrade, setSelectedTrade] = useState(defaultTradeSlug || 'clim');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('Tous');
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customValue, setCustomValue] = useState('');
    const [isOpenSelector, setIsOpenSelector] = useState(false);
    const [companyTrades, setCompanyTrades] = useState([]);

    // Fetch company's configured trade categories if available
    useEffect(() => {
        const fetchCompanyTrades = async () => {
            try {
                const data = await apiFetch('/v1/company');
                const company = data.data?.company || data.company;
                if (company?.tradeCategories && company.tradeCategories.length > 0) {
                    const slugs = company.tradeCategories.map(tc => tc.tradeCategory?.slug || tc.tradeCategory?.id).filter(Boolean);
                    if (slugs.length > 0) {
                        setCompanyTrades(slugs);
                        if (slugs.includes(defaultTradeSlug)) {
                            setSelectedTrade(defaultTradeSlug);
                        } else if (EQUIPMENT_CATALOG[slugs[0]]) {
                            setSelectedTrade(slugs[0]);
                        }
                    }
                }
            } catch (err) {
                // Keep default
            }
        };
        fetchCompanyTrades();
    }, [defaultTradeSlug]);

    // Available trades list
    const availableTrades = useMemo(() => {
        const trades = (companyTrades.length > 0 ? companyTrades : (userTradeSlugs.length > 0 ? userTradeSlugs : Object.keys(EQUIPMENT_CATALOG)))
            .map(slug => EQUIPMENT_CATALOG[slug])
            .filter(Boolean);
        return trades.length > 0 ? trades : Object.values(EQUIPMENT_CATALOG);
    }, [companyTrades, userTradeSlugs]);

    // Active trade data
    const activeTradeData = useMemo(() => {
        return EQUIPMENT_CATALOG[selectedTrade] || availableTrades[0] || EQUIPMENT_CATALOG.clim;
    }, [selectedTrade, availableTrades]);

    // Filtered models
    const filteredModels = useMemo(() => {
        if (!activeTradeData) return [];
        return activeTradeData.models.filter(item => {
            const matchesBrand = selectedBrand === 'Tous' || item.brand.toLowerCase() === selectedBrand.toLowerCase();
            const query = searchQuery.trim().toLowerCase();
            const matchesQuery = !query ||
                item.model.toLowerCase().includes(query) ||
                item.brand.toLowerCase().includes(query) ||
                (item.type && item.type.toLowerCase().includes(query)) ||
                (item.power && item.power.toLowerCase().includes(query));
            return matchesBrand && matchesQuery;
        });
    }, [activeTradeData, selectedBrand, searchQuery]);

    const handleSelectModel = (item) => {
        const fullValue = `${item.brand} ${item.model}`.trim();
        setIsCustomMode(false);
        setCustomValue('');
        if (onChange) onChange(fullValue);
        setIsOpenSelector(false);
    };

    const handleApplyCustom = (e) => {
        if (e) e.preventDefault();
        if (customValue.trim()) {
            if (onChange) onChange(customValue.trim());
            setIsOpenSelector(false);
        }
    };

    const handleClearSelection = () => {
        if (onChange) onChange('');
        setIsCustomMode(false);
        setCustomValue('');
    };

    // Horizontal scroll indicators and buttons
    const brandChipsRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
        if (brandChipsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = brandChipsRef.current;
            setCanScrollLeft(scrollLeft > 4);
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
        }
    };

    useEffect(() => {
        if (isOpenSelector) {
            const timer = setTimeout(() => checkScroll(), 80);
            window.addEventListener('resize', checkScroll);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', checkScroll);
            };
        }
    }, [isOpenSelector, selectedTrade, activeTradeData]);

    const scrollChips = (direction) => {
        if (brandChipsRef.current) {
            const offset = direction === 'left' ? -200 : 200;
            brandChipsRef.current.scrollBy({ left: offset, behavior: 'smooth' });
            setTimeout(checkScroll, 250);
        }
    };

    const handleChipsWheel = (e) => {
        if (brandChipsRef.current && e.deltaY) {
            brandChipsRef.current.scrollLeft += e.deltaY;
            checkScroll();
        }
    };

    return (
        <div className="equip-selector-container">
            {/* Value Preview & Quick Actions Bar */}
            <div className="equip-selector-input-bar">
                {value ? (
                    <div className="equip-selected-pill-box">
                        <div className="equip-selected-pill-info">
                            <span className="equip-selected-badge">
                                {value.split(' ')[0]}
                            </span>
                            <span className="equip-selected-text" title={value}>{value}</span>
                        </div>
                        <div className="equip-selected-pill-actions">
                            <button
                                type="button"
                                className="equip-pill-btn change"
                                onClick={() => setIsOpenSelector(!isOpenSelector)}
                                title="Changer l'équipement"
                            >
                                <Edit3 size={13} />
                                <span>Changer</span>
                            </button>
                            <button
                                type="button"
                                className="equip-pill-btn clear"
                                onClick={handleClearSelection}
                                title="Effacer l'équipement"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        className="equip-empty-trigger"
                        onClick={() => setIsOpenSelector(!isOpenSelector)}
                    >
                        <div className="equip-empty-left">
                            <Wrench size={16} className="equip-empty-icon" />
                            <span className="equip-empty-placeholder">{placeholder}</span>
                        </div>
                        <button type="button" className="equip-browse-btn">
                            <span>Choisir dans la liste</span>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal / Inline Dropdown Catalogue Selector */}
            {isOpenSelector && (
                <div className="equip-dropdown-panel animate-fade-in">
                    {/* Header with Trades Selector */}
                    <div className="equip-panel-header">
                        <div className="equip-trades-tabs">
                            {availableTrades.map(trade => {
                                const Icon = trade.icon || Wrench;
                                const isActive = selectedTrade === trade.id;
                                return (
                                    <button
                                        key={trade.id}
                                        type="button"
                                        className={`equip-trade-tab ${isActive ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedTrade(trade.id);
                                            setSelectedBrand('Tous');
                                            setIsCustomMode(false);
                                        }}
                                    >
                                        <Icon size={14} />
                                        <span>{trade.name.split('/')[0].split('(')[0].trim()}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search & Brands Bar */}
                    <div className="equip-panel-controls">
                        <div className="equip-search-box">
                            <Search size={15} className="equip-search-icon" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Rechercher un modèle (${activeTradeData.name})...`}
                                className="equip-search-input"
                                autoFocus
                            />
                            {searchQuery && (
                                <button type="button" className="equip-search-clear" onClick={() => setSearchQuery('')}>
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Brand Filter Chips with Scroll Arrows & Fade */}
                        <div className="equip-brand-chips-wrapper">
                            {canScrollLeft && (
                                <button
                                    type="button"
                                    className="equip-scroll-arrow left"
                                    onClick={() => scrollChips('left')}
                                    title="Défiler vers la gauche"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                            )}

                            <div
                                ref={brandChipsRef}
                                className={`equip-brand-chips-row ${canScrollRight ? 'has-overflow-right' : ''} ${canScrollLeft ? 'has-overflow-left' : ''}`}
                                onScroll={checkScroll}
                                onWheel={handleChipsWheel}
                            >
                                <button
                                    type="button"
                                    className={`equip-brand-chip ${selectedBrand === 'Tous' ? 'active' : ''}`}
                                    onClick={() => setSelectedBrand('Tous')}
                                >
                                    Tous
                                </button>
                                {activeTradeData.brands.map(b => (
                                    <button
                                        key={b}
                                        type="button"
                                        className={`equip-brand-chip ${selectedBrand === b ? 'active' : ''}`}
                                        onClick={() => setSelectedBrand(b)}
                                    >
                                        {b}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className={`equip-brand-chip custom-chip ${isCustomMode ? 'active' : ''}`}
                                    onClick={() => {
                                        setIsCustomMode(true);
                                        setCustomValue(value || '');
                                    }}
                                >
                                    <Plus size={12} />
                                    <span>Autre marque</span>
                                </button>
                            </div>

                            {canScrollRight && (
                                <button
                                    type="button"
                                    className="equip-scroll-arrow right"
                                    onClick={() => scrollChips('right')}
                                    title="Défiler vers la droite"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Custom Value Entry Form */}
                    {isCustomMode ? (
                        <div className="equip-custom-entry-box">
                            <div className="equip-custom-title">
                                <Sparkles size={14} />
                                <span>Saisie personnalisée (Marque / Modèle non listé)</span>
                            </div>
                            <form onSubmit={handleApplyCustom} className="equip-custom-form-row">
                                <input
                                    type="text"
                                    value={customValue}
                                    onChange={(e) => setCustomValue(e.target.value)}
                                    placeholder="ex: Viessmann Vitocal 250-A 10kW ou marque spécifique..."
                                    className="equip-custom-input"
                                    autoFocus
                                    required
                                />
                                <button type="submit" className="equip-custom-submit-btn">
                                    <Check size={14} />
                                    <span>Valider</span>
                                </button>
                            </form>
                            <button
                                type="button"
                                className="equip-back-to-list-btn"
                                onClick={() => setIsCustomMode(false)}
                            >
                                Revenir à la liste des marques
                            </button>
                        </div>
                    ) : (
                        /* Models List */
                        <div className="equip-models-list">
                            {filteredModels.length === 0 ? (
                                <div className="equip-empty-search-state">
                                    <p>Aucun modèle trouvé pour cette recherche.</p>
                                    <button
                                        type="button"
                                        className="equip-custom-fallback-btn"
                                        onClick={() => {
                                            setIsCustomMode(true);
                                            setCustomValue(searchQuery);
                                        }}
                                    >
                                        <Plus size={14} />
                                        <span>Créer "{searchQuery || 'équipement personnalisé'}"</span>
                                    </button>
                                </div>
                            ) : (
                                filteredModels.map((item, idx) => {
                                    const fullItemName = `${item.brand} ${item.model}`.trim();
                                    const isCurrent = value === fullItemName;
                                    return (
                                        <div
                                            key={idx}
                                            className={`equip-model-card ${isCurrent ? 'selected' : ''}`}
                                            onClick={() => handleSelectModel(item)}
                                        >
                                            <div className="equip-model-card-left">
                                                <span className="equip-model-brand-badge">{item.brand}</span>
                                                <div className="equip-model-info">
                                                    <h5 className="equip-model-name">{item.model}</h5>
                                                    <div className="equip-model-tags">
                                                        {item.type && <span className="equip-tag type">{item.type}</span>}
                                                        {item.power && <span className="equip-tag power">{item.power}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="equip-model-card-right">
                                                {isCurrent ? (
                                                    <div className="equip-check-circle active">
                                                        <Check size={14} />
                                                    </div>
                                                ) : (
                                                    <button type="button" className="equip-select-btn">
                                                        Choisir
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Footer Close */}
                    <div className="equip-panel-footer">
                        <button
                            type="button"
                            className="equip-panel-close-btn"
                            onClick={() => setIsOpenSelector(false)}
                        >
                            Fermer le catalogue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
