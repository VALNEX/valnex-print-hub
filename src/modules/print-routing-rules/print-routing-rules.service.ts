import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrintRoutingRuleDto } from './dto/create-print-routing-rules.dto';
import { UpdatePrintRoutingRuleDto } from './dto/update-print-routing-rules.dto';
import { FilterPrintRoutingRuleDto } from './dto/filter-print-routing-rules.dto';
import { Prisma } from '../../../generated/prisma/client.js';

@Injectable()
export class PrintRoutingRulesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePrintRoutingRuleDto) {
    const data: Prisma.PrintRoutingRuleUncheckedCreateInput = { ...dto };
    return this.prisma.client.printRoutingRule.create({
      data,
    });
  }

  findAll(filter: FilterPrintRoutingRuleDto) {
    const { page = 1, pageSize = 25, tenantId } = filter;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PrintRoutingRuleWhereInput = {
      ...(tenantId ? { tenantId } : {}),
    };

    return this.prisma.client.printRoutingRule.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.client.printRoutingRule.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdatePrintRoutingRuleDto) {
    const data: Prisma.PrintRoutingRuleUncheckedUpdateInput = { ...dto };
    return this.prisma.client.printRoutingRule.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.client.printRoutingRule.delete({ where: { id } });
  }
}