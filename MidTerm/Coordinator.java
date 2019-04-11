
import java.util.Map; 
import java.util.HashMap;
import java.util.Random;

/**
 * Class that models the coordinator. 
 * This entity is provided with a global view of the present nodes in the network
 * (they are stored in a Map) and is the entity that forces the join of the n nodes
 * 
 * @author Lorenzo Bellomo
 *
 */
public class Coordinator {
	
	/* Public and Static Fields */
	public static final int alpha = 3;

	/* Private Fields */
	
	private Map<Long, NodeDescriptor> nodes;
	private Random rand;
	private long n, m, k, identifierRange;

	/* Constructors */
	
	/**
	 * Constructor of the coordinator. It gets in input the parameters of the P2P network
	 * @param n number of nodes join
	 * @param m number of bits in the identifier
	 * @param k number of entries per bucket in the routing table
	 */
	public Coordinator(long n, long m, long k) {
		rand = new Random();
		this.n = n;
		this.m = m;
		this.k = k;
		identifierRange = (long) (Math.pow(2, m));
	}
	
	/* Methods */

	/**
	 * This method corresponds to the first phase (phase 1, initialization) in the
	 * midTerm text. It generates a first node with an empty routing table
	 */
	public void initialize() {
		nodes = new HashMap<>((int) n);
		long newId = (long) (rand.nextDouble() * identifierRange);
		NodeDescriptor first = new NodeDescriptor(newId, m, k);
		System.out.println("Generating first id: " + newId);
		nodes.put(first.getNodeId(), first);
	}
	
	/**
	 * This method generates a new node with identifier in the legal range 
	 * of allowed identifiers. It then chooses at random a bootstrap node between
	 * the ones already present in the network and simulates the join for
	 * given node with given bootstrap. After that, it tells the new node to issue a 
	 * given number of findNode operations targeting random IDs in order to populate 
	 * some entries in the routing table (and advertize the new node).
	 */
	public void generateNewNode() {
		// I generate a random id (different from the previous ones
		long newId = (long) (rand.nextDouble() * identifierRange);
		while (nodes.containsKey(newId))
			newId = (long) (rand.nextDouble() * identifierRange);
		System.out.println("Joining " + newId);
		
		// I find a random bootstrap node starting from the present ones
		long bootstrapId = (long) (rand.nextDouble() * nodes.size());
		NodeDescriptor bootstrap = nodes.values().stream().skip(bootstrapId).findFirst().get();
		System.out.println("bootstrap of " + newId + " is " + bootstrap.getNodeId());
		
		// I now join newId with bootstrap given
		NodeDescriptor newNode = new NodeDescriptor(newId, m, k);
		nodes.put(newId, newNode);
		newNode.joinNetwork(bootstrap);
		for(int i = 0; i < 1; i++) {
			long randomId = (long) (rand.nextDouble() * identifierRange);
			newNode.startFindNode(randomId, bootstrap);
		}	
	}
	
	/**
	 * This method simply makes the coordinator create the whole network
	 */
	public void createNetwork() {
		initialize();
		for (int i = 0; i < n - 1; i++)
			generateNewNode();

	}
	
}
