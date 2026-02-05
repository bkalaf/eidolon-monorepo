//chats/Avatar.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// chats/Avatar.ts (prompt chunk generator, NO API CALLS)

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Output chunk files:
 * /home/bobby/clocktower/all-avatars-00001.json
 * /home/bobby/clocktower/all-avatars-00002.json
 * ...
 */
const QUEUE_DIR = '/home/bobby/clocktower';
const CHUNK_BASENAME = 'all-avatars';
const CHUNK_SIZE = 10_000;

// If true, will refuse to overwrite existing chunk files
const REFUSE_OVERWRITE = true;

export enum BeastType {
    Fox = 1,
    Wolf = 2,
    Dragon = 3,
    Jaguar = 4,
    Serpent = 5,
    Tiger = 6,
    Bear = 7
}
export enum MythosType {
    'High Elf' = 1,
    Dwarf = 2,
    Halfling = 3,
    Orc = 4,
    Minotaur = 5,
    'Dark Elf' = 6,
    Goblin = 7,
    Gnome = 8,
    Ogre = 9
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
    'male-to-female' = 1,
    'non-binary' = 2,
    'female-to-male' = 3,
    'traditional-female' = 4
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
    Jewish = 2,
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
    'West Indes African Transplant (Haitian / Jamaican / Dominican)' = 18,
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
    beastType?: BeastType;
    mythosType?: MythosType;
}

const blockPrompt = `Create a vibrant high-fantasy character illustration (game key art / card art), idealized realism. Portrait orientation, tarot-card composition. Full-body or 3/4 body shot, dynamic mid-action pose. Character centered and clearly readable with strong silhouette and clean negative space. Expressive face and body language. Rich textures (cloth, leather, metal), believable wear and grime. Cinematic dramatic lighting: high contrast, strong rim light, colored bounce light motivated by the scene/magic. Grounded medieval-fantasy environment that reinforces the character’s cultural origin and class status.
Lower worker social standing must be obvious through wardrobe quality, repair patches, scuffed gear, practical layers.
No modern clothing. No text. No watermark. No UI elements. No logos.

Use the provided reference image as *visual guidance only* for overall rendering quality, texture richness, and lighting style.
Do not copy the exact character; generate a new character that matches the variables below.
`;

// OccupationType -> SocialClass -> SocialTier -> [3 archetypes]
const archetypes: any = {
    0: {
        0: {
            0: ['Roadside Tinker', 'Campfire Storykeeper', 'Ruin Scavenger'],
            1: ['Caravan Factor', 'Free Cartographer', 'Contract Courier'],
            2: ['Diplomatic Envoy', 'Royal Chronicler', 'Courtly Emissary']
        },
        1: {
            0: ['Dock Porter', 'Fieldhand Gatherer', 'Tannery Laborer'],
            1: ['Guild Artisan', 'Mill Overseer', 'Market Broker'],
            2: ['Master Architect', 'Treasury Assessor', 'Estate Administrator']
        },
        2: {
            0: ['Hedge Scribe', 'Shrine Attendant', 'Itinerant Preacher'],
            1: ['Town Archivist', 'Temple Educator', 'Civic Astrologer'],
            2: ['High Theologian', 'Imperial Historian', 'Philosophical Chancellor']
        },
        3: {
            0: ['Dispossessed Heir', 'Fallen House Retainer', 'Exiled Court Page'],
            1: ['Provincial Steward', 'Minor Court Official', 'Landed Adjudicator'],
            2: ['Court Patron', 'Dynastic Negotiator', 'Noble Consort']
        }
    },
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
        `[${
            (geography as number) !== 24 ? GeographicOrigin[geography]
            : beastType != null && (beastType as number) !== 0 ? BeastType[beastType]
            : MythosType[mythosType ?? 1]
        } ${archetypes[occupationType][socialClass][socialTier][archetypeIndex]}]
        A ${AgeGroup[ageGroup]} ${Gender[gender]} of ${GeographicOrigin[geography]} origin ${
            beastType ? `an anthropomorphic ${BeastType[beastType]}`
            : mythosType ? `a/an ${MythosType[mythosType]}`
            : ''
        } - a ${archetypes[occupationType][socialClass][socialTier][archetypeIndex]}. Depict the character actively performing their role as a ${archetypes[occupationType][socialClass][socialTier][archetypeIndex]}, with magical or adventuring elements integral to their identity. Wardrobe, gear, posture, and environment must clearly communicate this fantasy class and ${SocialTier[socialTier]} ${SocialClass[socialClass]} social standing. Style: vibrant high-fantasy character illustration (game key art / card art), idealized realism, strong silhouette readability, expressive face and body language, saturated but tasteful color palette, rich textures (cloth, leather, metal). Shot: full-body or 3/4 body, dynamic composition, character centered and readable. Scene: grounded medieval-fantasy environment that reinforces the fantasy class and cultural origin. Mood: lively, character-forward, mid-action, expressive. Color & lighting: cinematic dramatic lighting, rim light, colored bounce light, high contrast. Hard constraints: no text, no watermark, no modern clothing.
`,
        `- Geographic/cultural origin: ${GeographicOrigin[geography]}`,
        ...(beastType ? [`- Beast Type: Anthropomorphic-${BeastType[beastType]}`] : []),
        ...(mythosType ? [`- Mythological Character Type: ${MythosType[mythosType]}`] : []),
        `- Age: ${AgeGroup[ageGroup]}
- Gender expression: ${Gender[gender]}
- Civilian/Scout/Spellcaster/Brute: ${OccupationType[occupationType]}
- Social Standing: ${SocialTier[socialTier]} ${SocialClass[socialClass]}
- Character class/archetype: ${archetypes[occupationType][socialClass][socialTier][archetypeIndex]}`
    ].join('\n');

const modelOptions = {
    model: 'gpt-image-1',
    size: '1024x1536'
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
    return {
        ...partial,
        filename,
        prompt: variablesFromPrompt(partial)
    };
};

const blocked = [
    '0_0_1_1_2_2_2_0_0.png',
    '0_2_1_0_3_1_2_0_0.png',
    '0_2_2_2_0_0_1_0_0.png',
    '0_4_1_2_3_2_1_0_0.png',
    '0_4_1_2_3_2_1_0_0-b.png',
    '0_5_1_2_0_1_0_0_0.png',
    '0_5_2_1_0_0_2_0_0.png',
    '0_5_4_1_1_0_0_0_0.png',
    '0_6_1_1_3_1_0_0_0.png',
    '0_6_2_0_2_0_1_0_0.png',
    '1_1_4_2_3_2_1_0_0.png',
    '1_4_2_0_1_1_2_0_0.png',
    '1_5_3_3_2_0_0_0_0.png',
    '1_6_1_1_2_0_2_0_0.png',
    '2_1_2_0_0_0_2_0_0.png',
    '2_1_4_3_2_1_2_0_0.png',
    '2_3_3_2_3_0_0_0_0.png',
    '2_4_1_0_0_2_2_0_0.png',
    '3_2_2_3_1_1_1_0_0.png',
    '3_5_0_2_1_2_0_0_0.png',
    '3_6_1_3_2_0_1_0_0.png',
    '3_6_3_3_0_0_1_0_0.png',
    '3_6_3_3_0_1_2_0_0.png',
    '3_6_4_1_3_0_0_0_0.png',
    '4_1_0_2_0_2_0_0_0.png',
    '4_1_4_2_2_0_1_0_0.png',
    '4_2_2_0_2_1_1_0_0.png',
    '4_3_0_2_3_0_0_0_0.png',
    '4_4_3_3_1_1_2_0_0.png',
    '4_6_1_1_2_2_1_0_0.png',
    '4_6_4_0_3_1_1_0_0.png',
    '5_3_2_2_3_0_2_0_0.png',
    '5_4_0_0_3_0_2_0_0.png',
    '5_4_1_2_0_0_1_0_0.png',
    '5_4_4_1_3_0_2_0_0.png',
    '5_5_2_1_0_0_2_0_0.png',
    '6_3_3_0_0_0_1_0_0.png',
    '6_3_3_1_3_0_0_0_0.png',
    '7_0_0_3_2_2_2_0_0.png',
    '7_1_2_0_2_2_2_0_0.png',
    '7_5_4_1_1_0_2_0_0.png',
    '7_6_1_0_1_0_0_0_0.png',
    '7_6_2_0_2_2_2_0_0.png',
    '8_1_1_1_0_0_2_0_0.png',
    '8_1_1_2_2_0_0_0_0.png',
    '8_1_1_3_2_2_1_0_0.png',
    '8_2_0_2_0_0_1_0_0.png',
    '8_3_2_1_1_1_2_0_0.png',
    '8_5_3_0_0_2_1_0_0.png',
    '9_0_1_2_1_2_2_0_0.png',
    '9_1_0_1_3_1_1_0_0.png',
    '9_2_0_1_0_1_1_0_0.png',
    '9_2_1_0_1_2_2_0_0.png',
    '9_5_2_0_3_1_0_0_0.png',
    '9_6_0_2_3_0_1_0_0.png',
    '9_6_4_2_2_1_2_0_0.png',
    '10_1_2_2_2_2_2_0_0.png',
    '10_4_1_1_2_0_1_0_0.png',
    '10_6_0_2_3_1_2_0_0.png',
    '10_6_3_0_0_0_2_0_0.png',
    '11_0_0_0_2_0_2_0_0.png',
    '11_0_1_0_1_1_2_0_0.png',
    '11_0_1_0_3_0_2_0_0.png',
    '11_0_3_2_2_2_1_0_0.png',
    '11_1_2_3_0_2_2_0_0.png',
    '11_2_4_1_2_2_2_0_0.png',
    '11_3_0_2_3_0_0_0_0.png',
    '11_6_0_2_2_2_1_0_0.png',
    '11_6_1_2_3_1_2_0_0.png',
    '12_0_2_0_0_1_0_0_0.png',
    '12_0_3_0_2_2_1_0_0.png',
    '12_4_1_2_0_2_1_0_0.png',
    '12_6_3_2_2_0_0_0_0.png',
    '13_1_0_2_1_0_2_0_0.png',
    '13_2_4_0_1_0_1_0_0.png',
    '13_3_0_1_3_2_1_0_0.png',
    '13_3_1_2_3_0_2_0_0.png',
    '14_1_3_3_1_1_1_0_0.png',
    '14_1_4_0_0_0_1_0_0.png',
    '14_2_4_3_2_2_2_0_0.png',
    '14_3_4_1_2_2_1_0_0.png',
    '14_3_4_2_3_0_2_0_0.png',
    '14_5_3_0_3_2_1_0_0.png',
    '14_6_2_1_0_0_2_0_0.png',
    '14_6_4_0_1_2_0_0_0.png',
    '15_1_1_3_3_1_0_0_0.png',
    '15_1_2_1_1_2_1_0_0.png',
    '15_2_4_3_1_1_1_0_0.png',
    '15_3_1_1_2_1_2_0_0.png',
    '15_3_4_0_2_1_1_0_0.png',
    '15_5_2_2_1_0_2_0_0.png',
    '15_6_4_0_2_0_0_0_0.png',
    '15_6_4_0_2_0_2_0_0.png',
    '16_0_1_0_0_2_2_0_0.png',
    '16_0_1_2_0_0_0_0_0.png',
    '16_1_0_0_3_0_0_0_0.png',
    '16_2_2_2_2_2_2_0_0.png',
    '16_2_4_2_2_1_2_0_0.png',
    '16_4_0_2_0_1_2_0_0.png',
    '16_6_0_1_3_1_0_0_0.png',
    '17_0_0_3_3_0_1_0_0.png',
    '17_4_2_0_3_0_0_0_0.png',
    '17_4_2_3_1_1_1_0_0.png',
    '17_5_0_0_1_0_0_0_0.png',
    '17_5_3_1_1_1_0_0_0.png',
    '17_6_2_0_3_1_2_0_0.png',
    '17_6_3_1_2_2_0_0_0.png',
    '18_0_0_0_0_0_1_0_0.png',
    '18_1_2_3_1_2_0_0_0.png',
    '18_1_3_1_1_1_0_0_0.png',
    '18_3_0_2_1_0_2_0_0.png',
    '18_3_2_0_1_2_1_0_0.png',
    '18_5_2_0_1_1_2_0_0.png',
    '18_5_2_3_0_1_2_0_0.png',
    '18_6_2_1_3_2_2_0_0.png',
    '19_0_1_0_1_2_2_0_0.png',
    '19_0_1_1_0_2_0_0_0.png',
    '19_1_1_0_3_1_0_0_0.png',
    '19_3_4_1_2_0_1_0_0.png',
    '19_4_2_0_1_2_0_0_0.png',
    '19_4_3_0_1_1_0_0_0.png',
    '19_6_0_0_3_1_0_0_0.png',
    '19_6_0_3_1_2_1_0_0.png',
    '19_6_1_1_1_0_1_0_0.png',
    '19_6_1_1_2_2_1_0_0.png',
    '19_6_3_2_1_2_0_0_0.png',
    '20_1_0_2_2_2_1_0_0.png',
    '20_2_3_2_2_1_1_0_0.png',
    '20_5_3_2_2_2_0_0_0.png',
    '20_6_3_1_2_0_2_0_0.png',
    '20_6_3_2_1_2_2_0_0.png',
    '21_4_0_2_0_2_1_0_0.png',
    '21_4_1_2_2_2_1_0_0.png',
    '21_6_0_1_0_2_0_0_0.png',
    '21_6_0_1_1_2_1_0_0.png',
    '21_6_2_0_2_0_2_0_0.png',
    '21_6_3_2_1_1_0_0_0.png',
    '22_0_2_1_1_0_1_0_0.png',
    '22_1_4_2_3_2_1_0_0.png',
    '22_3_1_1_2_1_1_0_0.png',
    '22_3_4_2_0_2_1_0_0.png',
    '22_6_1_2_0_1_1_0_0.png',
    '22_6_2_3_1_2_1_0_0.png',
    '22_6_2_3_2_2_0_0_0.png',
    '23_0_4_0_0_1_1_0_0.png',
    '23_0_4_0_3_1_0_0_0.png',
    '23_1_1_1_0_0_0_0_0.png',
    '23_6_2_0_3_0_1_0_0.png',
    '24_0_0_0_0_0_2_1_0.png',
    '24_0_0_1_1_2_2_0_1.png',
    '24_0_1_2_0_0_2_5_0.png',
    '24_0_1_3_0_0_0_0_1.png',
    '24_0_1_3_3_1_2_0_5.png',
    '24_0_2_0_0_1_2_3_0.png',
    '24_0_2_0_1_1_0_1_0.png',
    '24_0_2_2_0_1_2_2_0.png',
    '24_0_3_3_1_0_2_4_0.png',
    '24_0_3_3_1_2_1_4_0.png',
    '24_0_4_0_0_2_2_0_1.png',
    '24_0_4_1_0_1_2_5_0.png',
    '24_0_4_1_2_1_1_3_0.png',
    '24_0_4_3_3_0_2_5_0.png',
    '24_1_0_1_3_0_2_4_0.png',
    '24_1_0_3_3_0_1_0_4.png',
    '24_1_1_2_1_1_0_0_7.png',
    '24_1_3_0_0_2_2_0_4.png',
    '24_1_3_0_1_0_2_0_1.png',
    '24_1_3_3_0_2_0_0_4.png',
    '24_1_4_0_1_2_1_2_0.png',
    '24_1_4_0_2_1_0_6_0.png',
    '24_1_4_2_0_2_1_0_4.png',
    '24_2_0_0_0_2_2_0_2.png',
    '24_2_0_3_0_0_2_0_8.png',
    '24_2_1_2_2_1_1_0_2.png',
    '24_2_1_2_3_1_0_4_0.png',
    '24_2_2_1_0_0_2_0_5.png',
    '24_2_2_1_1_2_0_0_4.png',
    '24_2_2_1_1_2_0_3_0.png',
    '24_2_2_2_2_0_2_0_2.png',
    '24_2_2_3_0_2_2_0_5.png',
    '24_2_3_1_0_0_2_6_0.png',
    '24_2_3_1_0_2_0_3_0.png',
    '24_2_3_1_3_0_2_0_4.png',
    '24_2_4_1_1_1_1_0_1.png',
    '24_3_0_0_2_1_0_0_5.png',
    '24_3_0_2_2_2_0_0_0.png',
    '24_3_0_2_3_1_1_0_6.png',
    '24_3_1_0_0_2_2_0_1.png',
    '24_3_1_0_2_2_1_0_1.png',
    '24_3_1_0_2_2_1_0_8.png',
    '24_3_3_1_2_2_1_0_6.png',
    '24_3_3_2_2_2_1_0_4.png',
    '24_3_3_3_1_2_0_0_4.png',
    '24_3_4_3_0_2_0_0_5.png',
    '24_3_4_3_1_1_0_0_3.png',
    '24_3_4_3_2_2_1_1_0.png',
    '24_4_0_0_3_2_2_0_2.png',
    '24_4_0_1_3_2_0_2_0.png',
    '24_4_0_2_2_2_0_0_1.png',
    '24_4_1_0_2_0_2_0_7.png',
    '24_4_1_2_3_1_1_0_5.png',
    '24_4_1_3_3_0_1_3_0.png',
    '24_4_2_0_0_1_2_1_0.png',
    '24_4_2_0_1_1_2_0_7.png',
    '24_4_4_0_2_1_0_0_3.png',
    '24_4_4_0_3_0_0_0_2.png',
    '24_5_0_1_3_2_0_0_6.png',
    '24_5_1_1_2_2_0_0_5.png',
    '24_5_1_2_0_1_1_1_0.png',
    '24_5_1_2_3_2_2_0_7.png',
    '24_5_1_3_3_1_2_4_0.png',
    '24_5_2_0_0_2_1_0_1.png',
    '24_5_2_0_1_1_1_0_5.png',
    '24_5_2_0_3_1_1_0_2.png',
    '24_5_2_3_0_0_2_0_3.png',
    '24_5_2_3_0_1_0_4_0.png',
    '24_5_2_3_3_1_0_4_0.png',
    '24_5_3_2_3_0_1_2_0.png',
    '24_5_3_2_3_0_1_5_0.png',
    '24_6_0_0_2_1_2_4_0.png',
    '24_6_0_1_2_1_1_5_0.png',
    '24_6_1_2_0_1_1_3_0.png',
    '24_6_2_2_2_0_1_1_0.png',
    '24_6_2_2_2_2_0_0_4.png',
    '24_6_3_2_3_1_0_0_2.png',
    '24_6_4_1_1_2_1_4_0.png',
    '24_6_4_2_1_0_1_0_4.png'
];
const blocking = new Set(blocked);

/**
 * Your generator (copied from your uploaded file; keep your customized logic here).
 * IMPORTANT: This should be a generator to avoid massive memory usage.
 */
export function* getNumberTuples(): Generator<any> {
    for (let i = 0; i <= 24; i++) {
        for (let j = 0; j <= 6; j++) {
            for (let k = 0; k <= 4; k++) {
                for (let l = 0; l <= 3; l++) {
                    for (let m = 0; m <= 3; m++) {
                        for (let n = 0; n <= 2; n++) {
                            for (let o = 0; o <= 2; o++) {
                                if (i === 24) {
                                    for (let p = 0; p <= 7; p++) {
                                        if (p === 0) {
                                            for (let q = 0; q <= 9; q++) {
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

function chunkPath(chunkIndex: number): string {
    return path.join(QUEUE_DIR, `${CHUNK_BASENAME}-${String(chunkIndex).padStart(5, '0')}.json`);
}

async function findExistingChunks(): Promise<string[]> {
    const files = await fs.readdir(QUEUE_DIR);
    return files.filter((f) => f.startsWith(`${CHUNK_BASENAME}-`) && f.endsWith('.json')).sort();
}

async function writeChunk(chunkIndex: number, items: Array<{ filename: string; prompt: string }>) {
    const out = chunkPath(chunkIndex);
    const tmp = `${out}.tmp`;

    await fs.writeFile(tmp, JSON.stringify(items, null, '\t'), 'utf8');
    await fs.rename(tmp, out);

    console.log(`Wrote chunk ${String(chunkIndex).padStart(5, '0')} (${items.length} prompts) -> ${out}`);
}

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

async function generatePromptChunks() {
    await fs.mkdir(QUEUE_DIR, { recursive: true });

    const existingChunks = await findExistingChunks();

    if (existingChunks.length > 0) {
        console.log(
            `Found ${existingChunks.length} existing chunk file(s). ` +
                `Skipping generation.\nFirst chunk: ${existingChunks[0]}`
        );
        return;
    }

    let chunkIndex = 1;
    let chunk: Array<{ filename: string; prompt: string }> = [];
    let total = 0;

    for (const tuple of shuffleArray(Array.from(getNumberTuples()))) {
        const mp = modelPrompt(tuple);
        if (blocking.has(mp.filename)) continue;

        chunk.push(mp);
        total++;

        if (chunk.length >= CHUNK_SIZE) {
            await writeChunk(chunkIndex++, chunk);
            chunk = [];
        }

        if (total % 100_000 === 0) {
            console.log(`Progress: ${total.toLocaleString()} prompts generated...`);
        }
    }

    if (chunk.length > 0) {
        await writeChunk(chunkIndex++, chunk);
    }

    console.log(`Done. Generated ${total.toLocaleString()} prompts into ${chunkIndex - 1} chunk file(s).`);
}

async function migrateChunksToPromptObjects() {
    const chunks = await findExistingChunks();
    if (chunks.length === 0) {
        console.log('No chunk files found to migrate.');
        return;
    }

    for (const filename of chunks) {
        const fullPath = path.join(QUEUE_DIR, filename);
        console.log(`Checking ${fullPath} ...`);

        const raw = await fs.readFile(fullPath, 'utf8');
        const data = JSON.parse(raw);

        if (!Array.isArray(data) || data.length === 0) {
            console.warn(`Skipping ${filename}: not an array or empty.`);
            continue;
        }

        const first = data[0];

        // Already migrated?
        if (typeof first === 'object' && first && 'prompt' in first && 'filename' in first) {
            console.log(`Already migrated: ${filename}`);
            continue;
        }

        // Expected old format: array (tuple)
        if (!Array.isArray(first)) {
            console.warn(`Skipping ${filename}: unrecognized element format.`);
            continue;
        }

        // Convert each tuple -> { filename, prompt }
        const converted = data.map((tuple: any) => {
            const mp = modelPrompt(tuple);
            return { filename: mp.filename, prompt: mp.prompt };
        });

        const tmp = `${fullPath}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(converted, null, '\t'), 'utf8');
        await fs.rename(tmp, fullPath);

        console.log(`Migrated ${filename}: ${converted.length} entries`);
    }

    console.log('Migration complete.');
}

async function main() {
    await fs.mkdir(QUEUE_DIR, { recursive: true });

    const existing = await findExistingChunks();
    if (existing.length > 0) {
        console.log(`Found ${existing.length} existing chunk file(s). Migrating format if needed...`);
        await migrateChunksToPromptObjects();
        return;
    }

    // No chunks exist -> generate new ones in prompt-object form
    await generatePromptChunks();
}

main().catch((err) => {
    console.error(err?.stack ?? err);
    process.exit(1);
});
