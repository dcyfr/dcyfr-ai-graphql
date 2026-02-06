/**
 * JSON custom scalar
 */

import { GraphQLScalarType, Kind } from 'graphql';

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',

  serialize(value: unknown): unknown {
    return value;
  },

  parseValue(value: unknown): unknown {
    return value;
  },

  parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT: {
        const result: Record<string, unknown> = {};
        for (const field of ast.fields) {
          result[field.name.value] = JSONScalar.parseLiteral(field.value, {});
        }
        return result;
      }
      case Kind.LIST:
        return ast.values.map((v) => JSONScalar.parseLiteral(v, {}));
      case Kind.NULL:
        return null;
      default:
        return null;
    }
  },
});
