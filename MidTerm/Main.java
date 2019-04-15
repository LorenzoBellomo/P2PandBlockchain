
import java.util.Scanner;

/**
 * Class that only interacts with the user to obtain the system wide parameters
 * and launches the coordinator lifecycle
 * 
 * @author Lorenzo Bellomo
 *
 */
public class Main {

	public static void main(String[] args) {
		
		long m = 0, n = 0, k = 0;
		
		/*if(args.length == 3) {
			m = Integer.parseInt(args[0]);
			n = Integer.parseInt(args[1]);
			k = Integer.parseInt(args[2]);
		} else {
			try(Scanner scanner = new Scanner(System.in);) {
				System.out.println("Please insert m (number of bits in the identifier): "); 
				m = Long.parseLong(scanner.nextLine()); 
				System.out.println("Please insert n (number of nodes that will join the network): "); 
				n = Long.parseLong(scanner.nextLine());
				System.out.println("Please insert k (maximum size of the routing tables): ");
				k = Long.parseLong(scanner.nextLine()); 
			} catch (NumberFormatException e) {
				 System.err.println("ERROR: Unrecognized format"); 
				 System.exit(-1); 
			}
		}*/
		m = 64;
		n = 500;
		k = 5;

		if(m <= 0 || k <= 0 || n < 0)
			throw new IllegalArgumentException("parameter out of range");

		Coordinator coordinator = new Coordinator(n, m, k);
		coordinator.createNetwork();

	}

}
