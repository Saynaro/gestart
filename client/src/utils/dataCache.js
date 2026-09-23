import { apiFetch } from "./api";

let _clientsCache = null;
let _catalogCache = null;
let _clientsPromise = null;
let _catalogPromise = null;

export const getCachedClients = () => _clientsCache;
export const getCachedCatalog = () => _catalogCache;

export const setCachedClients = (list) => {
    _clientsCache = list;
};

export const setCachedCatalog = (list) => {
    _catalogCache = list;
};

export const fetchClientsCompact = async (force = false) => {
    if (_clientsCache && !force) return _clientsCache;
    if (_clientsPromise && !force) return _clientsPromise;

    _clientsPromise = (async () => {
        try {
            const data = await apiFetch('/v1/clients?compact=true&limit=500');
            const list = data.data?.clients || data.clients || (Array.isArray(data) ? data : []);
            const mapped = list.map(c => ({
                id: c.id,
                name: c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Client",
                type: c.type === 'COMPANY' || c.companyName ? "Organisation" : "Particulier",
                email: c.email || "",
                phone: c.phone || "",
                address: c.address ? `${c.address}${c.postalCode || c.city ? `, ${c.postalCode || ''} ${c.city || ''}` : ''}`.trim() : (c.city || "")
            }));
            _clientsCache = mapped;
            return mapped;
        } catch (err) {
            console.warn("fetchClientsCompact error:", err);
            return _clientsCache || [];
        } finally {
            _clientsPromise = null;
        }
    })();

    return _clientsPromise;
};

export const fetchCatalogFast = async (force = false) => {
    if (_catalogCache && !force) return _catalogCache;
    if (_catalogPromise && !force) return _catalogPromise;

    _catalogPromise = (async () => {
        try {
            const res = await apiFetch('/v1/catalog');
            const raw = res.data || res.items || (Array.isArray(res) ? res : []);
            const mapped = raw.map(item => ({
                id: item.id,
                description: item.name || "Article",
                name: item.name || "Article",
                reference: item.reference || "",
                unitPrice: Number(item.defaultPrice || item.unitPrice || 0),
                tvaRate: Number(item.tvaRate !== undefined ? item.tvaRate : 20),
                urssafCategory: item.type === "PRODUCT" ? "Vente de marchandises (BIC)" : "Prestations de services (BNC)",
                unit: item.unit || "À l'unité"
            })).sort((a, b) => (a.description || "").localeCompare(b.description || ""));
            _catalogCache = mapped;
            return mapped;
        } catch (err) {
            console.warn("fetchCatalogFast error:", err);
            return _catalogCache || [];
        } finally {
            _catalogPromise = null;
        }
    })();

    return _catalogPromise;
};
