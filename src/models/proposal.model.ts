import {model, property} from '@loopback/repository';
import {Ownable} from '.';

@model({
  settings: {
    strict: true,
    forceId: false,
    description: 'Defines the purpose of an experiment and links an experiment to principal investigator and main proposer'
  }
})
export class Proposal extends Ownable {
  @property({
    type: 'string',
    id: true,
    required: true,
    description: Globally unique identifier of a proposal, eg. PID-prefix/internal-proposal-number. PID prefix is auto prepended,
  })
  proposalId: string;

  @property({
    type: 'string',
    index: true,
    description: Email of principal investigator,
  })
  pi_email?: string;

  @property({
    type: 'string',
    description: First name of principal investigator,
  })
  pi_firstname?: string;

  @property({
    type: 'string',
    description: Last name of principal investigator,
  })
  pi_lastname?: string;

  @property({
    type: 'string',
    required: true,
    description: Email of main proposer,
  })
  email: string;

  @property({
    type: 'string',
    description: First name of main proposer,
  })
  firstname?: string;

  @property({
    type: 'string',
    description: Last name of main proposer,
  })
  lastname?: string;

  @property({
    type: 'string',
  })
  title?: string;

  @property({
    type: 'string',
  })
  abstract?: string;

  @property({
    type: 'date',
  })
  startTime?: string;

  @property({
    type: 'date',
  })
  endTime?: string;

  @property({
    type: 'array',
    default: function() { return []; },
    itemType: 'MeasurementPeriod',
  })
  MeasurementPeriodList?: string[];


  constructor(data?: Partial<Proposal>) {
    super(data);
  }
}

export interface ProposalRelations {
  // describe navigational properties here
}

export type ProposalWithRelations = Proposal & ProposalRelations;
