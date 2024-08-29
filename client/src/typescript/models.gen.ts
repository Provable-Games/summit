
// Generated by dojo-bindgen on Fri, 23 Aug 2024 17:23:53 +0000. Do not modify this file manually.
// Import the necessary types from the recs SDK
// generate again with `sozo build --typescript` 
import { defineComponent, Type as RecsType, World } from "@dojoengine/recs";

export type ContractComponents = Awaited<ReturnType<typeof defineContractComponents>>;

// Type definition for `dojo::model::layout::Layout` enum
export type Layout = { type: 'Fixed'; value: RecsType.NumberArray; } | { type: 'Struct'; value: RecsType.StringArray; } | { type: 'Tuple'; value: RecsType.StringArray; } | { type: 'Array'; value: RecsType.StringArray; } | { type: 'ByteArray'; } | { type: 'Enum'; value: RecsType.StringArray; };

export const LayoutDefinition = {
    type: RecsType.String,
    value: RecsType.String
};
        
// Type definition for `core::byte_array::ByteArray` struct
export interface ByteArray {
    data: String[];
    pending_word: BigInt;
    pending_word_len: Number;
    
}
export const ByteArrayDefinition = {
    data: RecsType.StringArray,
    pending_word: RecsType.BigInt,
    pending_word_len: RecsType.Number,
    
};

// Type definition for `beast_of_the_hill::models::game::King` struct
export interface King {
    beast_id: Number;
    health: Number;
    
}
export const KingDefinition = {
    beast_id: RecsType.Number,
    health: RecsType.Number,
    
};

// Type definition for `dojo::model::layout::FieldLayout` struct
export interface FieldLayout {
    selector: BigInt;
    layout: Layout;
    
}
export const FieldLayoutDefinition = {
    selector: RecsType.BigInt,
    layout: LayoutDefinition,
    
};


// Type definition for `beast_of_the_hill::models::game::DeadBeast` struct
export interface DeadBeast {
    beast_id: Number;
    revival_date: BigInt;
    
}
export const DeadBeastDefinition = {
    beast_id: RecsType.Number,
    revival_date: RecsType.BigInt,
    
};


export function defineContractComponents(world: World) {
    return {

        // Model definition for `beast_of_the_hill::models::game::King` model
        King: (() => {
            return defineComponent(
                world,
                {
                    beast_id: RecsType.Number,
                    health: RecsType.Number,
                },
                {
                    metadata: {
                        namespace: "beast_of_the_hill",
                        name: "King",
                        types: ["u32", "u16"],
                        customTypes: [],
                    },
                }
            );
        })(),

        // Model definition for `beast_of_the_hill::models::game::DeadBeast` model
        DeadBeast: (() => {
            return defineComponent(
                world,
                {
                    beast_id: RecsType.Number,
                    revival_date: RecsType.BigInt,
                },
                {
                    metadata: {
                        namespace: "beast_of_the_hill",
                        name: "DeadBeast",
                        types: ["u32", "u128"],
                        customTypes: [],
                    },
                }
            );
        })(),
    };
}
