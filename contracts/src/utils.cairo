use core::traits::DivRem;

const TWO_POW_32: u256 = 0x100000000;
const TWO_POW_16_NZ: NonZero<u32> = 0x10000;
const TWO_POW_8_NZ_U16: NonZero<u16> = 0x100;

pub fn felt_to_u32(value: felt252) -> u32 {
    let value_u256: u256 = value.into();
    (value_u256 % TWO_POW_32.into()).try_into().unwrap()
}

pub fn u32_to_u8s(value: u32) -> (u8, u8, u8, u8) {
    let (rnd1_u16, rnd2_u16) = DivRem::div_rem(value, TWO_POW_16_NZ);
    let (rnd1_u8, rnd2_u8) = DivRem::div_rem(rnd1_u16.try_into().unwrap(), TWO_POW_8_NZ_U16);
    let (rnd3_u8, rnd4_u8) = DivRem::div_rem(rnd2_u16.try_into().unwrap(), TWO_POW_8_NZ_U16);
    (rnd1_u8.try_into().unwrap(), rnd2_u8.try_into().unwrap(), rnd3_u8.try_into().unwrap(), rnd4_u8.try_into().unwrap())
}
