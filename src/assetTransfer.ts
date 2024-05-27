/*
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";
import stringify from "json-stringify-deterministic";
import sortKeysRecursive from "sort-keys-recursive";

interface Vote {
  VoterID: string;
  CandidateID: string;
  Station: string;
}

@Info({
  title: "AssetContract",
  description: "Smart contract for a voting application",
})
export class AssetTransferContract extends Contract {
  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    const votes: Vote[] = [
      {
        VoterID: "voter1",
        CandidateID: "candidate1",
        Station: "station1",
      },
      {
        VoterID: "voter2",
        CandidateID: "candidate2",
        Station: "station2",
      },
    ];

    for (const vote of votes) {
      await ctx.stub.putState(
        vote.VoterID,
        Buffer.from(stringify(sortKeysRecursive(vote)))
      );
      console.info(`Vote from ${vote.VoterID} initialized`);
    }
  }

  @Transaction()
  public async RegisterVote(
    ctx: Context,
    voterID: string,
    candidateID: string,
    station: string
  ): Promise<void> {
    const exists = await this.VoteExists(ctx, voterID);
    if (exists) {
      throw new Error(`The vote from voter ${voterID} already exists`);
    }

    const vote: Vote = {
      VoterID: voterID,
      CandidateID: candidateID,
      Station: station,
    };
    await ctx.stub.putState(
      voterID,
      Buffer.from(stringify(sortKeysRecursive(vote)))
    );
  }

  @Transaction(false)
  public async ReadVote(ctx: Context, voterID: string): Promise<string> {
    const voteJSON = await ctx.stub.getState(voterID); // get the vote from chaincode state
    if (!voteJSON || voteJSON.length === 0) {
      throw new Error(`The vote from voter ${voterID} does not exist`);
    }
    return voteJSON.toString();
  }

  @Transaction()
  public async UpdateVote(
    ctx: Context,
    voterID: string,
    candidateID: string,
    station: string
  ): Promise<void> {
    const exists = await this.VoteExists(ctx, voterID);
    if (!exists) {
      throw new Error(`The vote from voter ${voterID} does not exist`);
    }

    // overwriting original vote with new vote
    const updatedVote: Vote = {
      VoterID: voterID,
      CandidateID: candidateID,
      Station: station,
    };
    await ctx.stub.putState(
      voterID,
      Buffer.from(stringify(sortKeysRecursive(updatedVote)))
    );
  }

  @Transaction()
  public async DeleteVote(ctx: Context, voterID: string): Promise<void> {
    const exists = await this.VoteExists(ctx, voterID);
    if (!exists) {
      throw new Error(`The vote from voter ${voterID} does not exist`);
    }
    await ctx.stub.deleteState(voterID);
  }

  @Transaction(false)
  @Returns("boolean")
  public async VoteExists(ctx: Context, voterID: string): Promise<boolean> {
    const voteJSON = await ctx.stub.getState(voterID);
    return voteJSON && voteJSON.length > 0;
  }

  @Transaction(false)
  @Returns("string")
  public async GetVoteStatistics(ctx: Context): Promise<string> {
    const allResults = {};
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();

    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      );
      let vote: Vote;
      try {
        vote = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        result = await iterator.next();
        continue;
      }

      if (!allResults[vote.CandidateID]) {
        allResults[vote.CandidateID] = 0;
      }
      allResults[vote.CandidateID] += 1;

      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }

  @Transaction(false)
  @Returns("string")
  public async GetAllVotes(ctx: Context): Promise<string> {
    const allResults = [];
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();

    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8"
      );
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }

  @Transaction()
  public async DeleteAllVotes(ctx: Context): Promise<void> {
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();

    while (!result.done) {
      await ctx.stub.deleteState(result.value.key);
      result = await iterator.next();
    }
    console.info("All votes have been deleted");
  }
}
