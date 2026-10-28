import { HttpException, HttpStatus } from '@nestjs/common';

export interface ProblemDetailsOptions {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export class ProblemDetailsException extends HttpException {
  public readonly problem: ProblemDetailsOptions;

  constructor(options: ProblemDetailsOptions) {
    super(options, options.status || HttpStatus.INTERNAL_SERVER_ERROR);
    this.problem = options;
  }
}
