export function generateMessageTypedData(identity, content, salt) {
  return {
    types: {
      StarknetDomain: [
        { name: "name", type: "shortstring" },
        { name: "version", type: "shortstring" },
        { name: "chainId", type: "shortstring" },
        { name: "revision", type: "shortstring" },
      ],
      OffchainMessage: [
        { name: "model", type: "shortstring" },
        { name: "savage_summit-Message", type: "Model" },
      ],
      Model: [
        { name: "identity", type: "ContractAddress" },
        { name: "content", type: "string" },
        { name: "salt", type: "felt" },
      ],
    },
    primaryType: "OffchainMessage",
    domain: {
      name: "Savage Summit",
      version: "1",
      chainId: "1",
      revision: "1",
    },
    message: {
      model: "savage_summit-Message",
      "savage_summit-Message": {
        identity,
        content,
        salt
      },
    },
  };
}