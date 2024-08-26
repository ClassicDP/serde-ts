
// models.ts
export class Address {
    constructor(public city: string, public street: string, public zipCode: string) {}
}

export class Employee {
    constructor(public name: string, public position: string, public salary: number, public address: Address) {}
}

export class Department {
    constructor(public name: string, public employees: Employee[]) {}
}

export class Company {
    constructor(public name: string, public departments: Department[]) {}
}