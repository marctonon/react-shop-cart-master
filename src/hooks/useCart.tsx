import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //Verificar se o product id já existe no cart
      const cartCopyToBeUpdated = [...cart];
      const productExistsInCart = cartCopyToBeUpdated.find(
        (product) => {
          if (product.id === productId) {
            return product;
          }
          return null;
        }
      );

      const stock  = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExistsInCart ? productExistsInCart.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExistsInCart) {
        productExistsInCart.amount = amount;
      }
      else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }

        cartCopyToBeUpdated.push(newProduct);
      }

      setCart(cartCopyToBeUpdated);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopyToBeUpdated));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartCopyToBeUpdated = [...cart];
      const productExists = cartCopyToBeUpdated.findIndex(
        (product) => {
          if (product.id === productId) {
            return product;
          }
          return null;
        }
      );

      if (productExists >= 0) {
        cartCopyToBeUpdated.splice(productExists, 1);
        setCart(cartCopyToBeUpdated);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopyToBeUpdated));
      }
      else {
        throw Error();
      };

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartCopyToBeUpdated = [...cart];
      const productExists = cartCopyToBeUpdated.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(cartCopyToBeUpdated);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopyToBeUpdated));
      }
      else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
