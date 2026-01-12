use core::traits::DivRem;

const TWO_POW_32: u256 = 0x100000000;
const MASK_32: u256 = 0xFFFFFFFF;
const TWO_POW_16_NZ: NonZero<u32> = 0x10000;
const TWO_POW_8_NZ_U16: NonZero<u16> = 0x100;

/// Convert felt252 to u32 by taking the lower 32 bits
/// Optimized: Uses AND mask instead of modulo
#[inline(always)]
pub fn felt_to_u32(value: felt252) -> u32 {
    let value_u256: u256 = value.into();
    (value_u256 & MASK_32).try_into().unwrap()
}

/// Split a u32 into 4 u8 values
#[inline(always)]
pub fn u32_to_u8s(value: u32) -> (u8, u8, u8, u8) {
    let (rnd1_u16, rnd2_u16) = DivRem::div_rem(value, TWO_POW_16_NZ);
    let (rnd1_u8, rnd2_u8) = DivRem::div_rem(rnd1_u16.try_into().unwrap(), TWO_POW_8_NZ_U16);
    let (rnd3_u8, rnd4_u8) = DivRem::div_rem(rnd2_u16.try_into().unwrap(), TWO_POW_8_NZ_U16);
    (rnd1_u8.try_into().unwrap(), rnd2_u8.try_into().unwrap(), rnd3_u8.try_into().unwrap(), rnd4_u8.try_into().unwrap())
}
