use starknet::ContractAddress;

#[derive(Drop, Serde)]
#[dojo::model]
pub struct Message {
    #[key]
    pub identity: ContractAddress,
    pub content: ByteArray,
    #[key]
    pub timestamp: u64
}
