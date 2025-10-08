const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying FAR2048Bet contract...");
  console.log("Network:", hre.network.name);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Fee collector address (change this to your desired address)
  const feeCollector = deployer.address; // Default to deployer, change in production
  
  console.log("Fee collector:", feeCollector);

  // Deploy contract
  const FAR2048Bet = await hre.ethers.getContractFactory("FAR2048Bet");
  const contract = await FAR2048Bet.deploy(feeCollector);

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("✅ FAR2048Bet deployed to:", contractAddress);

  // USDC addresses by network
  const usdcAddresses = {
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Sepolia USDC
    arbitrumSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Sepolia USDC
  };

  const usdcAddress = usdcAddresses[hre.network.name];
  
  if (usdcAddress) {
    console.log("📝 USDC Token Address:", usdcAddress);
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    feeCollector: feeCollector,
    usdcAddress: usdcAddress || "N/A",
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Wait for a few block confirmations before verifying
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await contract.deploymentTransaction().wait(5);

    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [feeCollector],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  console.log("\n📝 Add these to your .env:");
  console.log(`NEXT_PUBLIC_${hre.network.name.toUpperCase()}_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_${hre.network.name.toUpperCase()}_USDC_ADDRESS=${usdcAddress || "N/A"}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

