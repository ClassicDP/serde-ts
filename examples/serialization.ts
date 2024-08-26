

// serialization.ts
import { SerDe } from '../src/SerDe'; // Import the SerDe class from its module
import { Company, Department, Employee, Address } from './models'; // Import the models

// Register the classes for deserialization
SerDe.classRegistration([Company, Department, Employee, Address]);

// Create some nested structures
const company = new Company('Tech Corp', [
    new Department('Engineering', [
        new Employee('Alice', 'Engineer', 80000, new Address('New York', '5th Avenue', '10001')),
        new Employee('Bob', 'Engineer', 85000, new Address('San Francisco', 'Market Street', '94103'))
    ]),
    new Department('HR', [
        new Employee('Charlie', 'HR Manager', 60000, new Address('New York', 'Broadway', '10002')),
        new Employee('Dave', 'Recruiter', 55000, new Address('Boston', 'Beacon Hill', '02108'))
    ])
]);

// Serialize the Company object
const serializedCompany = SerDe.serialise(company);
console.log('Serialized Company:', JSON.stringify(serializedCompany, null, 2));

// Deserialize the serialized object
const deserializedCompany = SerDe.deserialize(serializedCompany);
console.log('Deserialized Company:', deserializedCompany);

// Verify that the deserialized object is equivalent to the original
console.log('Company name:', deserializedCompany.name);
console.log('First Department:', deserializedCompany.departments[0].name);
console.log('First Employee in Engineering:', deserializedCompany.departments[0].employees[0].name);
console.log('Address of First Employee in Engineering:', deserializedCompany.departments[0].employees[0].address.street);
