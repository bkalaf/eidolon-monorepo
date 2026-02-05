//chats/AvatarAPI.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// /home/bobby/clocktower/chats/Avatar.ts

import OpenAI, { toFile } from 'openai';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

// Where generated images will be written
const OUT_DIR = '/home/bobby/clocktower/src/assets/avatars';

// Queue persistence files (chunked so a huge queue doesn't exceed Node's 2GiB JSON read limit)
const QUEUE_DIR = '/home/bobby/clocktower';
const QUEUE_BASENAME = 'all-avatars';
const CHUNK_SIZE = 20000;
const LEGACY_QUEUE_PATH = `${QUEUE_DIR}/${QUEUE_BASENAME}.json`;

// Reference images for *soft guidance* (style/lighting/texture). One is picked randomly per avatar.
const references = [
    '/home/bobby/Downloads/reference.png',
    '/home/bobby/Downloads/reference-clergy.png',
    '/home/bobby/Downloads/reference-druid.png',
    '/home/bobby/Downloads/reference-priest.png',
    '/home/bobby/Downloads/reference-scout.png',
    '/home/bobby/Downloads/reference-scribe.png',
    '/home/bobby/Downloads/reference-wanderer.png',
    '/home/bobby/Downloads/reference-worker.png'
];

export enum BeastType {
    Fox = 1,
    Wolf = 2,
    Dragon = 3,
    Jaguar = 4,
    Serpent = 5
}
export enum MythosType {
    Elf = 1,
    Dwarf = 2,
    Halfling = 3,
    Orc = 4,
    Minotaur = 5
}
export enum OccupationType {
    Civilian = 0,
    Spellcaster = 1,
    Brute = 2,
    Scout = 3
}

export enum SocialTier {
    Lower = 0,
    Middle = 1,
    Upper = 2
}

export enum SocialClass {
    Wanderer = 0,
    Worker = 1,
    'Intellectual/Clergy' = 2,
    Nobility = 3
}

export enum Gender {
    'traditionally-male' = 0,
    'traditional-female' = 4,
    'non-binary' = 2,
    'male-to-female' = 1,
    'female-to-male' = 3
}

export enum AgeGroup {
    'late-teens' = 0,
    'college-aged' = 1,
    'single-young-adult' = 2,
    'newlywed' = 3,
    'married-with-children' = 4,
    'empty-nester' = 5,
    'senior' = 6
}

export enum GeographicOrigin {
    'Germanic / French' = 0,
    'Scandanavian (Danish / Icelandic)' = 1,
    'Jewish' = 2,
    'Middle Eastern (Persian / Turkish)' = 3,
    'North African (Moroccan / Egyptian)' = 4,
    'Central / South African (Nigerian / Congolese)' = 5,
    'East Asian (Japanese / Korean)' = 6,
    'Southeast Asian (Burmese / Laotian / Vietnamese)' = 7,
    'South American (Chilean / Brazilian)' = 8,
    'Indegenious American Indian' = 9,
    'Mainland East Asian (Chinese / Mongolian)' = 10,
    'Aboriginal Australian' = 11,
    'Anglo-Austrailian/New Zealander European Transplant' = 12,
    'Indian (Subcontinent Urban)' = 13,
    'Pacific Islander (Hawaiian / Polynesian / Samaoan)' = 14,
    'East Slavic (Kiev Rus / Russian)' = 15,
    'Hellenic Greek' = 16,
    'Irish / Celtic (British Isles)' = 17,
    'West Index African Transplant (Haitian / Jamaican / Dominican)' = 18,
    'Eastern European Romani' = 19,
    'British Saxon (England / Wales)' = 20,
    'Scottish (Scotland)' = 21,
    'Maori (New Zealand)' = 22,
    'Latino / Mexican (Mexico / Central America)' = 23
}
export interface AvatarDescriptor {
    occupationType: OccupationType;
    gender: Gender;
    ageGroup: AgeGroup;
    archetype: string;
    geography: GeographicOrigin;
    socialTier: SocialTier;
    socialClass: SocialClass;
    archetypeIndex: 0 | 1 | 2;
    filename?: string;
    prompt?: string;
    beastType?: BeastType;
    mythosType?: MythosType;
}

const blockPrompt = `Create a vibrant high-fantasy character illustration (game key art / card art), idealized realism.
Portrait orientation, tarot-card composition. Full-body or 3/4 body shot, dynamic mid-action pose.
Character centered and clearly readable with strong silhouette and clean negative space.
Expressive face and body language. Rich textures (cloth, leather, metal), believable wear and grime.
Cinematic dramatic lighting: high contrast, strong rim light, colored bounce light motivated by the scene/magic.
Grounded medieval-fantasy environment that reinforces the character’s cultural origin and class status.
Lower worker social standing must be obvious through wardrobe quality, repair patches, scuffed gear, practical layers.
No modern clothing. No text. No watermark. No UI elements. No logos.

Use the provided reference image as *visual guidance only* for overall rendering quality, texture richness, and lighting style.
Do not copy the exact character; generate a new character that matches the variables below.
`;
// VARIABLES:
// - Geographic/cultural origin: {ORIGIN}
// - Age: {AGE}
// - Gender expression: {GENDER}
// - Civilian/Scout/Spellcaster/Brute: {OCCUPATION}
// - Social Standing: {TIER} {SOCIAL}
// - Character class/archetype: {CLASS}
// - Mood: lively, character-forward, mid-action`;

const archetypes = {
    // Civilian = 0
    0: {
        // Wanderer = 0
        0: {
            // Lower = 0
            0: ['Roadside Tinker', 'Campfire Storykeeper', 'Ruin Scavenger'],
            // Middle = 1
            1: ['Caravan Factor', 'Free Cartographer', 'Contract Courier'],
            // Upper = 2
            2: ['Diplomatic Envoy', 'Royal Chronicler', 'Courtly Emissary']
        },
        // Worker = 1
        1: {
            0: ['Dock Porter', 'Fieldhand Gatherer', 'Tannery Laborer'],
            1: ['Guild Artisan', 'Mill Overseer', 'Market Broker'],
            2: ['Master Architect', 'Treasury Assessor', 'Estate Administrator']
        },
        // Intellectual/Clergy = 2
        2: {
            0: ['Hedge Scribe', 'Shrine Attendant', 'Itinerant Preacher'],
            1: ['Town Archivist', 'Temple Educator', 'Civic Astrologer'],
            2: ['High Theologian', 'Imperial Historian', 'Philosophical Chancellor']
        },
        // Nobility = 3
        3: {
            0: ['Dispossessed Heir', 'Fallen House Retainer', 'Exiled Court Page'],
            1: ['Provincial Steward', 'Minor Court Official', 'Landed Adjudicator'],
            2: ['Court Patron', 'Dynastic Negotiator', 'Noble Consort']
        }
    },

    // Spellcaster = 1
    1: {
        0: {
            0: ['Hedge Witch', 'Rune Beggar', 'Curse Peddler'],
            1: ['Arcane Surveyor', 'Leyline Prospector', 'Spellbound Courier'],
            2: ['Planar Envoy', 'Reality Auditor', 'Mythic Cartomancer']
        },
        1: {
            0: ['Alchemical Brewer', 'Ritual Laborer', 'Sigil Engraver'],
            1: ['Enchantment Smith', 'Civic Wardsman', 'Arcane Engineer'],
            2: ['Imperial Arcanist', 'Grand Enchanter', 'Mage-Architect']
        },
        2: {
            0: ['Shrine Thaumaturge', 'Folk Oracle', 'Candle-Seer'],
            1: ['Collegiate Magus', 'Temple Theurge', 'Astral Mathematician'],
            2: ['Archmage Scholar', 'High Hierophant', 'Metaphysical Chancellor']
        },
        3: {
            0: ['Bastard Mage-Scion', 'Disgraced Court Adept', 'Hidden Bloodline Caster'],
            1: ['Court Wizard', 'Arcane Advisor', 'Noble Spellwarden'],
            2: ['Sorcerer-Lord', 'Spellbound Regent', 'Arcane Dynast']
        }
    },

    // Brute = 2
    2: {
        0: {
            0: ['Pit Brawler', 'Road Enforcer', 'Wandering Strongarm'],
            1: ['Mercenary Captain', 'Caravan Guard', 'Contract Crusher'],
            2: ['Legendary Freeblade', 'Titan-Hired Muscle', 'Mythbound Gladiator']
        },
        1: {
            0: ['Quarry Breaker', 'Siege Loader', 'Foundry Mauler'],
            1: ['City Watch Enforcer', 'Guild Shieldbearer', 'Heavy Infantryman'],
            2: ['Royal Executioner', 'Palace Warden', 'Imperial Shock Troop']
        },
        2: {
            0: ['Flagellant Guardian', 'Temple Penitent', 'Relic Bearer'],
            1: ['Doctrine Enforcer', 'Inquisitorial Guard', 'Monastic Bruiser'],
            2: ['Sacred Juggernaut', 'Divine Punisher', 'Living Relic Guardian']
        },
        3: {
            0: ['Bastard Knight', 'Disowned Champion', 'Fallen House Bruiser'],
            1: ['House Champion', 'Duelist Protector', 'Armored Retainer'],
            2: ['Warlord Noble', 'Iron Duke', 'Bloodline Colossus']
        }
    },

    // Scout = 3
    3: {
        0: {
            0: ['Border Runner', 'Trail Skulker', 'Ruin Sneak'],
            1: ['Contract Pathfinder', 'Free Recon Agent', 'Route Surveyor'],
            2: ['Legendary Wayfinder', 'World-Walker', 'Myth Route Seeker']
        },
        1: {
            0: ['Night Watch Lookout', 'Hunter-Tracker', 'River Pathfinder'],
            1: ['City Scout', 'Guild Surveyor', 'Military Pathfinder'],
            2: ['Royal Pathfinder', 'Imperial Recon Master', 'Strategic Surveyor']
        },
        2: {
            0: ['Omen Watcher', 'Shrine Pathfinder', 'Pilgrim Guide'],
            1: ['Astrological Observer', 'Cartographic Savant', 'Lore-Seeking Ranger'],
            2: ['Omniscient Observer', 'Fate Cartographer', 'Prophetic Navigator']
        },
        3: {
            0: ['Disowned Pathfinder', 'Bastard Huntmaster', 'Exiled Page-Scout'],
            1: ['Court Ranger', 'Estate Huntmaster', 'Noble Recon Officer'],
            2: ['Shadow Prince', 'Horizon Lord', 'Dynastic Pathfinder']
        }
    }
};
const variablesFromPrompt = ({
    geography,
    gender,
    ageGroup,
    occupationType,
    socialClass,
    socialTier,
    archetypeIndex,
    beastType,
    mythosType
}: AvatarDescriptor) =>
    [
        `- Geographic/cultural origin: ${GeographicOrigin[geography]}`,
        ...(beastType ? [`- Beast Type: Anthropomorphic-${BeastType[beastType]}`] : []),
        ...(mythosType ? [`- Mythological Character Type: ${MythosType[mythosType]}`] : []),
        `- Age: ${AgeGroup[ageGroup]}
- Gender expression: ${Gender[gender]}
- Civilian/Scout/Spellcaster/Brute: ${OccupationType[occupationType]}
- Social Standing: ${SocialTier[socialTier]} ${SocialClass[socialClass]}
- Character class/archetype: ${archetypes[occupationType][socialClass][socialTier][archetypeIndex]}
- Mood: lively, character-forward, mid-action`
    ].join('\n');

const modelOptions = {
    model: 'gpt-image-1',
    size: '1024x1536' // supported: 1024x1024 | 1024x1536 | 1536x1024 | auto
};

type PromptInput = [
    GeographicOrigin,
    AgeGroup,
    Gender,
    OccupationType,
    SocialClass,
    SocialTier,
    0 | 1 | 2,
    BeastType?,
    MythosType?
];
const modelPrompt = (avatar: PromptInput) => {
    const partial = {
        geography: avatar[0],
        ageGroup: avatar[1],
        gender: avatar[2],
        occupationType: avatar[3],
        socialClass: avatar[4],
        socialTier: avatar[5],
        archetypeIndex: avatar[6],
        archetype: archetypes[avatar[3]][avatar[4]][avatar[5]][avatar[6]],
        beastType: avatar[7],
        mythosType: avatar[8]
    } as Omit<AvatarDescriptor, 'prompt' | 'filename'>;
    const filename = avatar
        .map((x) => (x ?? 0).toFixed(0))
        .join('_')
        .concat('.png');
    const prompt = {
        ...modelOptions,
        prompt: [blockPrompt, variablesFromPrompt(partial)]
    };
    return {
        ...partial,
        filename,
        prompt
    };
};

function shuffleArray(array: any[]) {
    let currentIndex = array.length,
        randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element using array destructuring.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

export function* getNumberTuples(): Generator<any> {
    for (let i = 0; i <= 24; i++) {
        for (let j = 0; j <= 6; j++) {
            for (let k = 0; k <= 4; k++) {
                for (let l = 0; l <= 3; l++) {
                    for (let m = 0; m <= 3; m++) {
                        for (let n = 0; n <= 2; n++) {
                            for (let o = 0; o <= 2; o++) {
                                if (i === 0) {
                                    for (let p = 0; p <= 4; p++) {
                                        if (p === 0) {
                                            for (let q = 0; q <= 4; q++) {
                                                const result = [
                                                    i,
                                                    j,
                                                    k,
                                                    l,
                                                    m,
                                                    n,
                                                    o as 0 | 1 | 2,
                                                    p === 0 ? undefined : p,
                                                    q === 0 ? undefined : q
                                                ];
                                                yield result;
                                            }
                                        } else {
                                            const result = [
                                                i,
                                                j,
                                                k,
                                                l,
                                                m,
                                                n,
                                                o as 0 | 1 | 2,
                                                p === 0 ? undefined : p,
                                                undefined
                                            ];
                                            yield result;
                                        }
                                    }
                                } else {
                                    const result = [i, j, k, l, m, n, o as 0 | 1 | 2, undefined, undefined];
                                    yield result;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

async function listChunkFiles(): Promise<{ file: string; seq: number }[]> {
    const entries = await fs.readdir(QUEUE_DIR).catch((err: any) => {
        if (err?.code === 'ENOENT') return [] as string[];
        throw err;
    });

    const matches: { file: string; seq: number }[] = [];
    const reFile = new RegExp(`^${QUEUE_BASENAME}-(\\d+)\\.json$`);
    for (const name of entries) {
        const m = name.match(reFile);
        if (!m) continue;
        const seq = Number(m[1]);
        if (Number.isFinite(seq)) matches.push({ file: path.join(QUEUE_DIR, name), seq });
    }
    matches.sort((a, b) => a.seq - b.seq);
    return matches;
}

function chunkPath(seq: number): string {
    const padded = String(seq).padStart(5, '0');
    return path.join(QUEUE_DIR, `${QUEUE_BASENAME}-${padded}.json`);
}

async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
    const tmp = `${filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value), 'utf8');
    await fs.rename(tmp, filePath);
}

async function ensureChunkQueueExists(): Promise<void> {
    const existing = await listChunkFiles();
    if (existing.length > 0) return;

    // If an old single-file queue exists, split it—BUT don't attempt to read >2GiB.
    if (fsSync.existsSync(LEGACY_QUEUE_PATH)) {
        const st = fsSync.statSync(LEGACY_QUEUE_PATH);
        if (st.size >= 2_147_483_648) {
            throw new Error(
                `Legacy queue file is too large to read in Node (>2GiB): ${LEGACY_QUEUE_PATH}. ` +
                    `Delete or move it, then rerun to regenerate chunked queues.`
            );
        }
        const raw = await fs.readFile(LEGACY_QUEUE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error(`Legacy queue file is not an array: ${LEGACY_QUEUE_PATH}`);

        let seq = 1;
        for (let i = 0; i < parsed.length; i += CHUNK_SIZE) {
            const chunk = parsed.slice(i, i + CHUNK_SIZE);
            await atomicWriteJson(chunkPath(seq), chunk);
            seq++;
        }
        await fs.rename(LEGACY_QUEUE_PATH, `${LEGACY_QUEUE_PATH}.migrated`);
        return;
    }

    // No existing queues: generate chunks directly from the generator without materializing everything in RAM.
    let seq = 1;
    let buf: PromptInput[] = [];
    for (const tuple of getNumberTuples()) {
        buf.push(tuple);
        if (buf.length >= CHUNK_SIZE) {
            // Shuffle *within* the chunk for some variety without needing a full global shuffle.
            shuffleArray(buf);
            await atomicWriteJson(chunkPath(seq), buf);
            seq++;
            buf = [];
        }
    }
    if (buf.length > 0) {
        shuffleArray(buf);
        await atomicWriteJson(chunkPath(seq), buf);
    }
}

async function loadFirstChunk(): Promise<{ file: string; items: PromptInput[] } | null> {
    await ensureChunkQueueExists();
    const chunks = await listChunkFiles();
    if (chunks.length === 0) return null;

    const first = chunks[0].file;
    const raw = await fs.readFile(first, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error(`Chunk file is not an array: ${first}`);
    return { file: first, items: parsed as PromptInput[] };
}

async function saveChunk(filePath: string, items: PromptInput[]): Promise<void> {
    if (items.length === 0) {
        await fs.unlink(filePath).catch((err: any) => {
            if (err?.code !== 'ENOENT') throw err;
        });
        return;
    }
    await atomicWriteJson(filePath, items);
}

function pickRandomReference(): string {
    const idx = Math.floor(Math.random() * references.length);
    return references[idx];
}

function guessMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'image/png';
}

function parseDurationToMs(v?: string | null): number | null {
    if (!v) return null;
    const str = String(v).trim().toLowerCase();
    let ms = 0;
    const re = /(\d+)\s*(ms|s|m|h)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(str))) {
        const num = Number(match[1]);
        const unit = match[2];
        if (unit === 'ms') ms += num;
        else if (unit === 's') ms += num * 1000;
        else if (unit === 'm') ms += num * 60_000;
        else if (unit === 'h') ms += num * 3_600_000;
    }
    return ms > 0 ? ms : null;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err: any): boolean {
    const status = err?.status ?? err?.response?.status;
    if (status === 429) return true;
    if (status === 408 || status === 409) return true;
    if (status === 500 || status === 502 || status === 503 || status === 504) return true;

    const code = err?.code ?? err?.cause?.code;
    if (code && ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND'].includes(code)) return true;
    return false;
}

function getRetryDelayMs(err: any, attempt: number): number {
    const headers = err?.headers || err?.response?.headers || err?.cause?.headers;
    const retryAfter = headers?.['retry-after'] ?? headers?.['Retry-After'] ?? null;
    const rlResetReq = headers?.['x-ratelimit-reset-requests'] ?? headers?.['X-RateLimit-Reset-Requests'] ?? null;
    const rlResetTok = headers?.['x-ratelimit-reset-tokens'] ?? headers?.['X-RateLimit-Reset-Tokens'] ?? null;

    const headerMs = parseDurationToMs(retryAfter) ?? parseDurationToMs(rlResetReq) ?? parseDurationToMs(rlResetTok);
    if (headerMs != null) return clamp(headerMs + 250, 250, 60_000);

    const base = Math.min(60_000, 1000 * Math.pow(2, attempt - 1));
    const jitter = Math.floor(Math.random() * 250);
    return clamp(base + jitter, 500, 60_000);
}

async function generateImageToDisk(
    client: OpenAI,
    payload: { model: string; prompt: string[] | string; size: string },
    outFile: string
): Promise<void> {
    const prompt = Array.isArray(payload.prompt) ? payload.prompt.join('\n\n') : payload.prompt;

    // Soft guidance: use an image edit with low fidelity.
    const refPath = pickRandomReference();
    if (!fsSync.existsSync(refPath)) {
        throw new Error(`Reference image not found: ${refPath}`);
    }

    const fileLike = await toFile(fsSync.createReadStream(refPath), null, { type: guessMimeType(refPath) });

    const rsp = await client.images.edit({
        model: payload.model,
        image: [fileLike],
        prompt,
        size: '1024x1536',
        input_fidelity: 'low',
        output_format: 'png'
    });

    const b64 = rsp?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No b64_json returned from image API call');

    const buf = Buffer.from(b64, 'base64');
    await fs.writeFile(outFile, buf);
}

async function generateWithRetry(
    client: OpenAI,
    payload: { model: string; prompt: string[] | string; size: string },
    outFile: string,
    maxAttempts = 3
): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await generateImageToDisk(client, payload, outFile);
            return;
        } catch (err: any) {
            const status = err?.status ?? err?.response?.status;
            const msg = err?.message ?? String(err);

            if (!isRetryable(err) || attempt === maxAttempts) {
                throw new Error(
                    `Image generation failed (attempt ${attempt}/${maxAttempts})` +
                        (status ? ` [HTTP ${status}]` : '') +
                        `: ${msg}`
                );
            }

            const waitMs = getRetryDelayMs(err, attempt);
            console.warn(
                `Retrying (attempt ${attempt}/${maxAttempts})` +
                    (status ? ` [HTTP ${status}]` : '') +
                    ` after ${waitMs}ms: ${msg}`
            );
            await sleep(waitMs);
        }
    }
}

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY in environment.');

    const client = new OpenAI({ apiKey });

    await fs.mkdir(OUT_DIR, { recursive: true });

    while (true) {
        const chunk = await loadFirstChunk();
        if (!chunk) break;

        const { file: chunkFile, items } = chunk;

        if (items.length === 0) {
            await saveChunk(chunkFile, []);
            continue;
        }

        const next = items[0];
        const remainingInChunk = items.slice(1);

        // Persist chunk *before* doing work so restarts are safe.
        await saveChunk(chunkFile, remainingInChunk);

        const job = modelPrompt(next);
        const outFile = path.join(OUT_DIR, job.filename!);

        console.log(
            `Generating ${job.filename} (chunk: ${path.basename(chunkFile)}, remaining in chunk: ${remainingInChunk.length})`
        );
        await generateWithRetry(client, job.prompt as any, outFile, 3);
    }

    console.log('Queue empty. Done.');
}

main().catch((e) => {
    console.error(e?.stack ?? e);
    process.exit(1);
});
