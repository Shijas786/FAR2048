const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("FAR2048Bet", function () {
  // Fixture to deploy contract and setup test environment
  async function deployFixture() {
    const [owner, feeCollector, player1, player2, player3, player4] =
      await ethers.getSigners();

    // Deploy mock USDC token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USDC", "USDC", 6); // 6 decimals like real USDC

    // Deploy FAR2048Bet
    const FAR2048Bet = await ethers.getContractFactory("FAR2048Bet");
    const betting = await FAR2048Bet.deploy(feeCollector.address);

    // Mint USDC to players
    const wagerAmount = ethers.parseUnits("10", 6); // 10 USDC
    await usdc.mint(player1.address, ethers.parseUnits("1000", 6));
    await usdc.mint(player2.address, ethers.parseUnits("1000", 6));
    await usdc.mint(player3.address, ethers.parseUnits("1000", 6));
    await usdc.mint(player4.address, ethers.parseUnits("1000", 6));

    return {
      betting,
      usdc,
      owner,
      feeCollector,
      player1,
      player2,
      player3,
      player4,
      wagerAmount,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct owner and fee collector", async function () {
      const { betting, owner, feeCollector } = await loadFixture(deployFixture);

      expect(await betting.owner()).to.equal(owner.address);
      expect(await betting.feeCollector()).to.equal(feeCollector.address);
    });

    it("Should initialize with correct default values", async function () {
      const { betting } = await loadFixture(deployFixture);

      expect(await betting.matchCounter()).to.equal(0);
      expect(await betting.platformFeePercent()).to.equal(100); // 1%
    });
  });

  describe("Match Creation", function () {
    it("Should create a new match", async function () {
      const { betting, usdc, player1, wagerAmount } = await loadFixture(
        deployFixture
      );

      await expect(
        betting.connect(player1).createMatch(wagerAmount, await usdc.getAddress(), 4)
      )
        .to.emit(betting, "MatchCreated")
        .withArgs(1, player1.address, wagerAmount, await usdc.getAddress(), 4);

      expect(await betting.matchCounter()).to.equal(1);
    });

    it("Should fail to create match with zero wager", async function () {
      const { betting, usdc, player1 } = await loadFixture(deployFixture);

      await expect(
        betting.connect(player1).createMatch(0, await usdc.getAddress(), 4)
      ).to.be.revertedWith("Wager must be > 0");
    });

    it("Should fail with invalid max players", async function () {
      const { betting, usdc, player1, wagerAmount } = await loadFixture(
        deployFixture
      );

      await expect(
        betting.connect(player1).createMatch(wagerAmount, await usdc.getAddress(), 1)
      ).to.be.revertedWith("Max players: 2-4");

      await expect(
        betting.connect(player1).createMatch(wagerAmount, await usdc.getAddress(), 5)
      ).to.be.revertedWith("Max players: 2-4");
    });
  });

  describe("Joining Match", function () {
    it("Should allow player to join match", async function () {
      const { betting, usdc, player1, player2, wagerAmount } =
        await loadFixture(deployFixture);

      // Create match
      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 4);

      // Approve USDC
      await usdc.connect(player2).approve(await betting.getAddress(), wagerAmount);

      // Join match
      await expect(betting.connect(player2).joinMatch(1))
        .to.emit(betting, "PlayerJoined")
        .withArgs(1, player2.address, 1);
    });

    it("Should fail to join without USDC approval", async function () {
      const { betting, usdc, player1, player2, wagerAmount } =
        await loadFixture(deployFixture);

      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 4);

      await expect(betting.connect(player2).joinMatch(1)).to.be.reverted;
    });

    it("Should auto-start match when full", async function () {
      const { betting, usdc, player1, player2, player3, player4, wagerAmount } =
        await loadFixture(deployFixture);

      // Create 2-player match for faster testing
      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 2);

      // Player 1 joins
      await usdc.connect(player1).approve(await betting.getAddress(), wagerAmount);
      await betting.connect(player1).joinMatch(1);

      // Player 2 joins - should auto-start
      await usdc.connect(player2).approve(await betting.getAddress(), wagerAmount);
      await expect(betting.connect(player2).joinMatch(1))
        .to.emit(betting, "MatchStarted");
    });

    it("Should prevent joining the same match twice", async function () {
      const { betting, usdc, player1, wagerAmount } = await loadFixture(
        deployFixture
      );

      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 4);

      await usdc.connect(player1).approve(await betting.getAddress(), wagerAmount * 2n);
      await betting.connect(player1).joinMatch(1);

      await expect(betting.connect(player1).joinMatch(1)).to.be.revertedWith(
        "Already joined"
      );
    });
  });

  describe("Winner Declaration", function () {
    it("Should declare winner and distribute pot correctly", async function () {
      const { betting, usdc, owner, feeCollector, player1, player2, wagerAmount } =
        await loadFixture(deployFixture);

      // Create and join match
      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 2);

      await usdc.connect(player1).approve(await betting.getAddress(), wagerAmount);
      await betting.connect(player1).joinMatch(1);

      await usdc.connect(player2).approve(await betting.getAddress(), wagerAmount);
      await betting.connect(player2).joinMatch(1);

      // Check balances before
      const player1BalanceBefore = await usdc.balanceOf(player1.address);

      // Declare winner
      await expect(betting.connect(owner).declareWinner(1, player1.address))
        .to.emit(betting, "MatchEnded");

      // Check balances after
      const totalPot = wagerAmount * 2n;
      const platformFee = (totalPot * 100n) / 10000n; // 1%
      const winnings = totalPot - platformFee;

      const player1BalanceAfter = await usdc.balanceOf(player1.address);
      const feeCollectorBalance = await usdc.balanceOf(feeCollector.address);

      expect(player1BalanceAfter - player1BalanceBefore).to.equal(winnings);
      expect(feeCollectorBalance).to.equal(platformFee);
    });

    it("Should fail if non-owner tries to declare winner", async function () {
      const { betting, usdc, player1, player2, wagerAmount } =
        await loadFixture(deployFixture);

      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 2);

      await usdc.connect(player1).approve(await betting.getAddress(), wagerAmount);
      await betting.connect(player1).joinMatch(1);

      await usdc.connect(player2).approve(await betting.getAddress(), wagerAmount);
      await betting.connect(player2).joinMatch(1);

      await expect(
        betting.connect(player1).declareWinner(1, player1.address)
      ).to.be.revertedWithCustomError(betting, "OwnableUnauthorizedAccount");
    });
  });

  describe("Match Cancellation", function () {
    it("Should allow host to cancel match and refund players", async function () {
      const { betting, usdc, player1, player2, wagerAmount } =
        await loadFixture(deployFixture);

      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 4);

      await usdc.connect(player2).approve(await betting.getAddress(), wagerAmount);
      await betting.connect(player2).joinMatch(1);

      const player2BalanceBefore = await usdc.balanceOf(player2.address);

      await expect(betting.connect(player1).cancelMatch(1))
        .to.emit(betting, "MatchCancelled");

      const player2BalanceAfter = await usdc.balanceOf(player2.address);
      expect(player2BalanceAfter - player2BalanceBefore).to.equal(wagerAmount);
    });
  });

  describe("View Functions", function () {
    it("Should return correct match details", async function () {
      const { betting, usdc, player1, wagerAmount } = await loadFixture(
        deployFixture
      );

      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 4);

      const match = await betting.getMatch(1);
      expect(match.host).to.equal(player1.address);
      expect(match.wagerAmount).to.equal(wagerAmount);
      expect(match.maxPlayers).to.equal(4);
    });

    it("Should return players list", async function () {
      const { betting, usdc, player1, player2, wagerAmount } =
        await loadFixture(deployFixture);

      await betting
        .connect(player1)
        .createMatch(wagerAmount, await usdc.getAddress(), 4);

      await usdc.connect(player1).approve(await betting.getAddress(), wagerAmount);
      await betting.connect(player1).joinMatch(1);

      await usdc.connect(player2).approve(await betting.getAddress(), wagerAmount);
      await betting.connect(player2).joinMatch(1);

      const players = await betting.getMatchPlayers(1);
      expect(players.length).to.equal(2);
      expect(players[0]).to.equal(player1.address);
      expect(players[1]).to.equal(player2.address);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update platform fee", async function () {
      const { betting, owner } = await loadFixture(deployFixture);

      await expect(betting.connect(owner).setPlatformFee(200))
        .to.emit(betting, "PlatformFeeUpdated")
        .withArgs(200);

      expect(await betting.platformFeePercent()).to.equal(200);
    });

    it("Should prevent setting fee above maximum", async function () {
      const { betting, owner } = await loadFixture(deployFixture);

      await expect(betting.connect(owner).setPlatformFee(600)).to.be.revertedWith(
        "Max fee: 5%"
      );
    });
  });
});

// Mock ERC20 contract for testing
const MockERC20 = {
  abi: [
    "constructor(string memory name, string memory symbol, uint8 decimals)",
    "function mint(address to, uint256 amount) public",
    "function balanceOf(address account) public view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  ],
  bytecode: "0x", // Will be generated by Hardhat
};

